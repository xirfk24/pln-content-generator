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

// normalizePubStatus canonicalizes status aliases and rejects values that are
// not a known publication status, returning "" for invalid ones.
func normalizePubStatus(s string) string {
	switch s {
	case "DELAY":
		return "DELAYED"
	case "CANCEL":
		return "CANCELLED"
	case "PLANNED", "PUBLISHED", "DELAYED", "CANCELLED":
		return s
	default:
		return ""
	}
}

// publishableContentStatuses mirrors the workflow rule for MARK_PUBLISHED:
// a publication may only be marked PUBLISHED when the underlying content has
// passed approval (APPROVED / READY_TO_PUBLISH) or is already published.
// This prevents PUT /api/publications/:id from short-circuiting the approval
// chain on DRAFT/PENDING_REVIEW content.
var publishableContentStatuses = map[string]bool{
	"APPROVED":         true,
	"READY_TO_PUBLISH": true,
	"PUBLISHED":        true,
}

// contentAllowsPublish reports whether the content row with the given id is in
// a status that permits marking one of its publications as PUBLISHED.
// Returns ("", false) when the content does not exist.
func (h *Handler) contentAllowsPublish(ctx context.Context, contentID string) (string, bool) {
	var status string
	err := h.Pool.QueryRow(ctx, "SELECT status FROM contents WHERE id = $1", contentID).Scan(&status)
	if err != nil {
		return "", false
	}
	return status, publishableContentStatuses[status]
}

// GET /api/publications
func (h *Handler) ListPublications(c *gin.Context) {
	where := []string{"TRUE"}
	args := []any{}

	if v := c.Query("status"); v != "" {
		switch v {
		case "DELAY", "DELAYED":
			where = append(where, "(p.status = 'DELAYED' OR (p.status = 'PLANNED' AND p.planned_publish_date < CURRENT_DATE))")
		case "PLANNED":
			where = append(where, "(p.status = 'PLANNED' AND (p.planned_publish_date >= CURRENT_DATE OR p.planned_publish_date IS NULL))")
		default:
			args = append(args, v)
			where = append(where, "p.status = $"+itoa(len(args)))
		}
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

	// Auto-tag DELAYED status in memory if planned date has passed and still PLANNED
	todayStr := time.Now().Format("2006-01-02")
	for i := range publications {
		if publications[i].Status == "PLANNED" && publications[i].PlannedPublishDate != nil && *publications[i].PlannedPublishDate < todayStr {
			publications[i].Status = "DELAYED"
		}
	}

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
	CancelReason       *string `json:"cancel_reason"`
}

// POST /api/publications
func (h *Handler) CreatePublication(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	var in publicationInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if in.ContentID == nil || *in.ContentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID konten wajib diisi"})
		return
	}
	status := "PLANNED"
	if in.Status != nil && *in.Status != "" {
		status = normalizePubStatus(*in.Status)
		if status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status publikasi tidak valid. Gunakan PLANNED, PUBLISHED, DELAYED, atau CANCELLED"})
			return
		}
		// Creating an already-PUBLISHED record is equivalent to the
		// MARK_PUBLISHED workflow action — only allowed on approved content.
		if status == "PUBLISHED" {
			if _, ok := h.contentAllowsPublish(c.Request.Context(), *in.ContentID); !ok {
				c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
				return
			}
			if !h.gatePublish(c, *in.ContentID) {
				return
			}
		}
	}

	if in.URL != nil && *in.URL != "" {
		u, err := url.Parse(*in.URL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format URL publikasi tidak valid (harus diawali http:// atau https://)"})
			return
		}
	}

	var id string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO publications (content_id, platform_id, planned_publish_date, actual_publish_date, url, status, notes, cancel_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
	`, *in.ContentID, in.PlatformID, in.PlannedPublishDate, in.ActualPublishDate, in.URL, status, in.Notes, in.CancelReason).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat record publikasi"})
		return
	}

	pub := h.getPublication(c.Request.Context(), id)
	if pub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat record publikasi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"publication": pub, "message": "Record publikasi berhasil ditambahkan"})
}

// PUT /api/publications/:id
func (h *Handler) UpdatePublication(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")
	var in publicationInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if in.URL != nil && *in.URL != "" {
		u, err := url.Parse(*in.URL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format URL publikasi tidak valid (harus diawali http:// atau https://)"})
			return
		}
	}

	// Validasi pembatalan wajib ada alasan
	if in.Status != nil && (*in.Status == "CANCELLED" || *in.Status == "CANCEL") {
		if in.CancelReason == nil || strings.TrimSpace(*in.CancelReason) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Alasan pembatalan wajib diisi saat membatalkan publikasi"})
			return
		}
	}

	// Whitelist status publikasi + gate transisi PUBLISHED ke state workflow.
	normalizedStatus := ""
	if in.Status != nil && *in.Status != "" {
		normalizedStatus = normalizePubStatus(*in.Status)
		if normalizedStatus == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status publikasi tidak valid. Gunakan PLANNED, PUBLISHED, DELAYED, atau CANCELLED"})
			return
		}
		if normalizedStatus == "PUBLISHED" {
			contentID, ok := h.publicationContentID(c.Request.Context(), id)
			if !ok {
				c.JSON(http.StatusNotFound, gin.H{"error": "Publikasi tidak ditemukan"})
				return
			}
			if !h.gatePublish(c, contentID) {
				return
			}
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
		add("status", normalizedStatus)
	}
	if in.Notes != nil {
		add("notes", nullable(*in.Notes))
	}
	if in.CancelReason != nil {
		add("cancel_reason", nullable(*in.CancelReason))
	}

	args = append(args, id)
	res, err := h.Pool.Exec(c.Request.Context(),
		"UPDATE publications SET "+strings.Join(setClauses, ", ")+" WHERE id = $"+itoa(len(args)), args...)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui publikasi"})
		return
	}

	// Jika status jadi PUBLISHED, update juga konten terkait jika semua publikasi sudah dipublikasikan
	if normalizedStatus == "PUBLISHED" {
		var contentID string
		_ = h.Pool.QueryRow(c.Request.Context(), "SELECT content_id FROM publications WHERE id = $1", id).Scan(&contentID)
		if contentID != "" {
			_, _ = h.Pool.Exec(c.Request.Context(), `
				UPDATE contents SET status = 'PUBLISHED', updated_at = now() WHERE id = $1
			`, contentID)
		}
	}

	pub := h.getPublication(c.Request.Context(), id)
	if pub == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Publikasi tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"publication": pub, "message": "Data publikasi berhasil diperbarui"})
}

// DELETE /api/publications/:id — admin only, matching the UI which only
// exposes the delete action to ADMINs.
func (h *Handler) DeletePublication(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat menghapus record publikasi"})
		return
	}
	id := c.Param("id")
	res, err := h.Pool.Exec(c.Request.Context(), "DELETE FROM publications WHERE id = $1", id)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus publikasi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Publikasi berhasil dihapus"})
}

// GET /api/publications/:id/metrics
func (h *Handler) ListMetrics(c *gin.Context) {
	id := c.Param("id")
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, publication_id, views, likes, comments, shares, saves, reach, recorded_at::TEXT, created_at
		FROM performance_metrics WHERE publication_id = $1
		ORDER BY recorded_at DESC`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil metrik performa"})
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
	Views      *float64 `json:"views"`
	Likes      *float64 `json:"likes"`
	Comments   *float64 `json:"comments"`
	Shares     *float64 `json:"shares"`
	Saves      *float64 `json:"saves"`
	Reach      *float64 `json:"reach"`
	RecordedAt *string  `json:"recorded_at"`
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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nilai metrik harus berupa angka non-negatif yang valid"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan metrik performa"})
		return
	}

	m := h.getMetric(c.Request.Context(), metricID)
	c.JSON(http.StatusOK, gin.H{"metric": m, "message": "Data performa berhasil disimpan"})
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

// gatePublish enforces the workflow rule for marking a publication PUBLISHED:
// the content must be APPROVED, READY_TO_PUBLISH, or already PUBLISHED —
// the same states the MARK_PUBLISHED workflow action accepts. It writes the
// HTTP error response itself and returns false when the gate rejects.
func (h *Handler) gatePublish(c *gin.Context, contentID string) bool {
	status, ok := h.contentAllowsPublish(c.Request.Context(), contentID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return false
	}
	if !publishableContentStatuses[status] {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Konten dengan status '" + status + "' belum melewati persetujuan dan tidak dapat ditandai sebagai terbit. Gunakan alur kerja persetujuan terlebih dahulu.",
		})
		return false
	}
	return true
}

// publicationContentID returns the content id of the given publication.
func (h *Handler) publicationContentID(ctx context.Context, pubID string) (string, bool) {
	var contentID string
	err := h.Pool.QueryRow(ctx, "SELECT content_id FROM publications WHERE id = $1", pubID).Scan(&contentID)
	if err != nil {
		return "", false
	}
	return contentID, true
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
		       p.url, p.status, p.notes, p.cancel_reason, p.created_at, p.updated_at,
		       pl.id, pl.name, pl.icon, pl.created_at,
		       c.id, c.title, c.topic, c.status, c.pic,
		       pil.name
		FROM publications p
		LEFT JOIN platforms pl ON pl.id = p.platform_id
		LEFT JOIN contents c ON c.id = p.content_id
		LEFT JOIN pillars pil ON pil.id = c.pillar_id
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
		var cPic, cancelReason, pilName *string
		if err := rows.Scan(&p.ID, &p.ContentID, &p.PlatformID, &p.PlannedPublishDate, &p.ActualPublishDate,
			&p.URL, &p.Status, &p.Notes, &cancelReason, &p.CreatedAt, &p.UpdatedAt,
			&plID, &plName, &plIcon, &plCreated,
			&cID, &cTitle, &cTopic, &cStatus, &cPic, &pilName); err != nil {
			log.Printf("queryPublicationsWithContent scan error: %v", err)
			continue
		}
		p.CancelReason = cancelReason
		if plID != nil {
			p.Platform = &models.Platform{ID: *plID, Name: derefString(plName), Icon: plIcon, CreatedAt: derefTime(plCreated)}
		}
		if cID != nil {
			p.Content = &models.PublicationContent{
				ID:         *cID,
				Title:      derefString(cTitle),
				Topic:      derefString(cTopic),
				Status:     derefString(cStatus),
				Pic:        cPic,
				PillarName: pilName,
			}
		}
		out = append(out, p)
		ids = append(ids, p.ID)
	}
	return out, ids
}

func isInf(v float64) bool {
	return v != v || v > 1e308 || v < -1e308
}
