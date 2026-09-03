package handlers

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/models"
)

var publicationStatuses = []string{"PLANNED", "PUBLISHED", "DELAYED", "CANCELLED"}

// GET /api/publications
func (h *Handler) ListPublications(c *gin.Context) {
	where := []string{"TRUE"}
	args := []any{}

	if v := c.Query("status"); v != "" {
		args = append(args, v)
		where = append(where, "p.status = $"+itoa(len(args)))
	}
	if v := c.Query("platform_id"); v != "" {
		args = append(args, v)
		where = append(where, "p.platform_id = $"+itoa(len(args)))
	}
	if v := c.Query("date_from"); v != "" {
		args = append(args, v)
		where = append(where, "p.planned_publish_date >= $"+itoa(len(args)))
	}
	if v := c.Query("date_to"); v != "" {
		args = append(args, v)
		where = append(where, "p.planned_publish_date <= $"+itoa(len(args)))
	}

	publications, pubIDs := h.queryPublicationsWithContent(c.Request.Context(),
		strings.Join(where, " AND "), args...)
	h.attachMetrics(c.Request.Context(), publications, pubIDs)
	c.JSON(http.StatusOK, gin.H{"publications": publications})
}

type publicationInput struct {
	ContentID          *string `json:"content_id"`
	PlatformID         *string `json:"platform_id"`
	PlannedPublishDate *string `json:"planned_publish_date"`
	ActualPublishDate  *string `json:"actual_publish_date"`
	URL                *string `json:"url"`
	Status             *string `json:"status"`
	Notes              *string `json:"notes"`
}

// POST /api/publications
func (h *Handler) CreatePublication(c *gin.Context) {
	var in publicationInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if in.ContentID == nil || *in.ContentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content_id is required"})
		return
	}
	status := "PLANNED"
	if in.Status != nil && *in.Status != "" {
		if !containsStatus(publicationStatuses, *in.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
			return
		}
		status = *in.Status
	}

	var id string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO publications (content_id, platform_id, planned_publish_date, actual_publish_date, url, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
	`, *in.ContentID, in.PlatformID, in.PlannedPublishDate, in.ActualPublishDate, in.URL, status, in.Notes).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create publication"})
		return
	}

	pub := h.getPublication(c.Request.Context(), id)
	if pub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load publication"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"publication": pub})
}

// PUT /api/publications/:id
func (h *Handler) UpdatePublication(c *gin.Context) {
	id := c.Param("id")
	var in publicationInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if in.URL != nil && *in.URL != "" {
		u, err := url.Parse(*in.URL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
			return
		}
	}

	setClauses := []string{"updated_at = now()"}
	args := []any{}
	add := func(col string, val any) {
		args = append(args, val)
		setClauses = append(setClauses, col+" = $"+itoa(len(args)))
	}
	if in.PlatformID != nil {
		add("platform_id", nullable(*in.PlatformID))
	}
	if in.PlannedPublishDate != nil {
		add("planned_publish_date", nullable(*in.PlannedPublishDate))
	}
	if in.ActualPublishDate != nil {
		add("actual_publish_date", nullable(*in.ActualPublishDate))
	}
	if in.URL != nil {
		add("url", nullable(*in.URL))
	}
	if in.Status != nil {
		if !containsStatus(publicationStatuses, *in.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
			return
		}
		add("status", *in.Status)
	}
	if in.Notes != nil {
		add("notes", nullable(*in.Notes))
	}

	args = append(args, id)
	res, err := h.Pool.Exec(c.Request.Context(),
		"UPDATE publications SET "+strings.Join(setClauses, ", ")+" WHERE id = $"+itoa(len(args)), args...)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update publication"})
		return
	}

	pub := h.getPublication(c.Request.Context(), id)
	if pub == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Publication not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"publication": pub})
}

// DELETE /api/publications/:id
func (h *Handler) DeletePublication(c *gin.Context) {
	id := c.Param("id")
	res, err := h.Pool.Exec(c.Request.Context(), "DELETE FROM publications WHERE id = $1", id)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete publication"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GET /api/publications/:id/metrics
func (h *Handler) ListMetrics(c *gin.Context) {
	id := c.Param("id")
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, publication_id, views, likes, comments, shares, saves, reach, recorded_at::TEXT, created_at
		FROM performance_metrics WHERE publication_id = $1
		ORDER BY recorded_at DESC`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}
	defer rows.Close()

	metrics := []models.PerformanceMetric{}
	for rows.Next() {
		var m models.PerformanceMetric
		if err := rows.Scan(&m.ID, &m.PublicationID, &m.Views, &m.Likes, &m.Comments,
			&m.Shares, &m.Saves, &m.Reach, &m.RecordedAt, &m.CreatedAt); err != nil {
			continue
		}
		metrics = append(metrics, m)
	}
	c.JSON(http.StatusOK, gin.H{"metrics": metrics})
}

type metricInput struct {
	Views       *float64 `json:"views"`
	Likes       *float64 `json:"likes"`
	Comments    *float64 `json:"comments"`
	Shares      *float64 `json:"shares"`
	Saves       *float64 `json:"saves"`
	Reach       *float64 `json:"reach"`
	RecordedAt  *string  `json:"recorded_at"`
}

// POST /api/publications/:id/metrics — upsert by (publication_id, recorded_at)
func (h *Handler) UpsertMetric(c *gin.Context) {
	id := c.Param("id")
	var in metricInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	recordedAt := time.Now().UTC().Format("2006-01-02")
	if in.RecordedAt != nil && *in.RecordedAt != "" {
		if t, ok := parseDateStr(*in.RecordedAt); ok {
			recordedAt = t.Format("2006-01-02")
		}
	}

	toInt := func(v *float64) int {
		if v == nil {
			return 0
		}
		return int(*v)
	}
	views, likes := toInt(in.Views), toInt(in.Likes)
	comments, shares := toInt(in.Comments), toInt(in.Shares)
	saves, reach := toInt(in.Saves), toInt(in.Reach)

	for _, v := range []float64{float64(views), float64(likes), float64(comments), float64(shares), float64(saves), float64(reach)} {
		if v < 0 || isInf(v) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Metric values must be non-negative finite numbers"})
			return
		}
	}

	var existingID string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT id FROM performance_metrics WHERE publication_id = $1 AND recorded_at = $2",
		id, recordedAt).Scan(&existingID)

	var metricID string
	if err == nil {
		if uerr := h.Pool.QueryRow(c.Request.Context(), `
			UPDATE performance_metrics SET views=$1, likes=$2, comments=$3, shares=$4, saves=$5, reach=$6
			WHERE id=$7 RETURNING id
		`, views, likes, comments, shares, saves, reach, existingID).Scan(&metricID); uerr != nil {
			log.Printf("upsertMetric update error: %v", uerr)
		}
	} else {
		if ierr := h.Pool.QueryRow(c.Request.Context(), `
			INSERT INTO performance_metrics (publication_id, views, likes, comments, shares, saves, reach, recorded_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
		`, id, views, likes, comments, shares, saves, reach, recordedAt).Scan(&metricID); ierr != nil {
			log.Printf("upsertMetric insert error: %v", ierr)
		}
	}

	if metricID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save metric"})
		return
	}

	m := h.getMetric(c.Request.Context(), metricID)
	c.JSON(http.StatusOK, gin.H{"metric": m})
}

func (h *Handler) getMetric(ctx context.Context, id string) *models.PerformanceMetric {
	var m models.PerformanceMetric
	err := h.Pool.QueryRow(ctx, `
		SELECT id, publication_id, views, likes, comments, shares, saves, reach, recorded_at::TEXT, created_at
		FROM performance_metrics WHERE id = $1`, id).
		Scan(&m.ID, &m.PublicationID, &m.Views, &m.Likes, &m.Comments, &m.Shares, &m.Saves, &m.Reach, &m.RecordedAt, &m.CreatedAt)
	if err != nil {
		log.Printf("getMetric error: %v", err)
		return nil
	}
	return &m
}

// getPublication fetches one publication with platform + content + metrics.
func (h *Handler) getPublication(ctx context.Context, id string) *models.Publication {
	publications, pubIDs := h.queryPublicationsWithContent(ctx, "p.id = $1", id)
	if len(publications) == 0 {
		return nil
	}
	h.attachMetrics(ctx, publications, pubIDs)
	return &publications[0]
}

// queryPublicationsWithContent fetches publications joined with platform and content.
func (h *Handler) queryPublicationsWithContent(ctx context.Context, where string, args ...any) ([]models.Publication, []string) {
	rows, err := h.Pool.Query(ctx, `
		SELECT p.id, p.content_id, p.platform_id, p.planned_publish_date::TEXT, p.actual_publish_date::TEXT,
		       p.url, p.status, p.notes, p.created_at, p.updated_at,
		       pl.id, pl.name, pl.icon, pl.created_at,
		       c.id, c.title, c.topic, c.status, c.pic
		FROM publications p
		LEFT JOIN platforms pl ON pl.id = p.platform_id
		LEFT JOIN contents c ON c.id = p.content_id
		WHERE `+where+`
		ORDER BY p.planned_publish_date ASC`, args...)
	if err != nil {
		log.Printf("queryPublicationsWithContent query error: %v (where=%s)", err, where)
		return []models.Publication{}, nil
	}
	defer rows.Close()

	out := []models.Publication{}
	ids := []string{}
	for rows.Next() {
		var p models.Publication
		var plID, plName, plIcon *string
		var plCreated *timeDb
		var cID, cTitle, cTopic, cStatus *string
		var cPic *string
		if err := rows.Scan(&p.ID, &p.ContentID, &p.PlatformID, &p.PlannedPublishDate, &p.ActualPublishDate,
			&p.URL, &p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
			&plID, &plName, &plIcon, &plCreated,
			&cID, &cTitle, &cTopic, &cStatus, &cPic); err != nil {
			log.Printf("queryPublicationsWithContent scan error: %v", err)
			continue
		}
		if plID != nil {
			p.Platform = &models.Platform{ID: *plID, Name: derefString(plName), Icon: plIcon, CreatedAt: derefTime(plCreated)}
		}
		if cID != nil {
			p.Content = &models.PublicationContent{ID: *cID, Title: derefString(cTitle), Topic: derefString(cTopic), Status: derefString(cStatus), Pic: cPic}
		}
		out = append(out, p)
		ids = append(ids, p.ID)
	}
	return out, ids
}

func isInf(v float64) bool {
	return v != v || v > 1e308 || v < -1e308
}
