package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/models"
)

var indoMonths = map[int]string{
	1:  "Januari",
	2:  "Februari",
	3:  "Maret",
	4:  "April",
	5:  "Mei",
	6:  "Juni",
	7:  "Juli",
	8:  "Agustus",
	9:  "September",
	10: "Oktober",
	11: "November",
	12: "Desember",
}

func formatIndoDate(d time.Time) string {
	return fmt.Sprintf("%02d %s %d", d.Day(), indoMonths[int(d.Month())], d.Year())
}

// checkPeriodOverlap checks if [startDate, endDate] conflicts with any non-archived period.
func (h *Handler) checkPeriodOverlap(ctx context.Context, startDate, endDate string, excludeID string) (string, bool) {
	query := `
		SELECT name, start_date::TEXT, end_date::TEXT
		FROM planning_periods
		WHERE status != 'DIARSIPKAN'
		AND start_date <= $2 AND end_date >= $1
	`
	args := []any{startDate, endDate}
	if excludeID != "" {
		query += " AND id != $3"
		args = append(args, excludeID)
	}
	query += " LIMIT 1"

	var conflictName, cStart, cEnd string
	err := h.Pool.QueryRow(ctx, query, args...).Scan(&conflictName, &cStart, &cEnd)
	if err != nil {
		return "", false
	}

	cSDate, _ := time.Parse("2006-01-02", cStart)
	cEDate, _ := time.Parse("2006-01-02", cEnd)
	return fmt.Sprintf("Rentang tanggal bertabrakan dengan periode \"%s\" (%s – %s). Silakan gunakan tanggal yang belum terpakai.",
		conflictName, formatIndoDate(cSDate), formatIndoDate(cEDate)), true
}

// GET /api/planning-periods
func (h *Handler) ListPlanningPeriods(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT
			p.id, p.name, p.start_date::TEXT, p.end_date::TEXT, p.status, p.description,
			p.created_by::TEXT, p.created_at, p.updated_at,
			COUNT(c.id) AS total_contents,
			COUNT(c.id) FILTER (WHERE c.status = 'PUBLISHED') AS published_count,
			COUNT(c.id) FILTER (WHERE c.status = 'DRAFT') AS draft_count,
			COUNT(c.id) FILTER (WHERE c.status IN ('PENDING_REVIEW', 'PENDING_PRODUCTION_REVIEW')) AS pending_count,
			COUNT(c.id) FILTER (WHERE c.status = 'APPROVED') AS approved_count,
			COUNT(c.id) FILTER (WHERE c.status = 'PRODUCTION') AS production_count
		FROM planning_periods p
		LEFT JOIN contents c
			ON c.planned_date >= p.start_date
			AND c.planned_date <= p.end_date
			AND COALESCE(c.is_savings, FALSE) = FALSE
		GROUP BY p.id
		ORDER BY p.start_date DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar periode perencanaan"})
		return
	}
	defer rows.Close()

	periods := []models.PlanningPeriod{}
	for rows.Next() {
		var p models.PlanningPeriod
		var desc, createdBy *string
		if err := rows.Scan(
			&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &desc,
			&createdBy, &p.CreatedAt, &p.UpdatedAt,
			&p.TotalContents, &p.PublishedCount, &p.DraftCount,
			&p.PendingCount, &p.ApprovedCount, &p.ProductionCount,
		); err != nil {
			continue
		}
		p.Description = desc
		p.CreatedBy = createdBy
		periods = append(periods, p)
	}

	c.JSON(http.StatusOK, gin.H{"periods": periods})
}

// GET /api/planning-periods/:id
func (h *Handler) GetPlanningPeriod(c *gin.Context) {
	id := c.Param("id")

	var p models.PlanningPeriod
	var desc, createdBy *string
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT
			p.id, p.name, p.start_date::TEXT, p.end_date::TEXT, p.status, p.description,
			p.created_by::TEXT, p.created_at, p.updated_at,
			COUNT(c.id) AS total_contents,
			COUNT(c.id) FILTER (WHERE c.status = 'PUBLISHED') AS published_count,
			COUNT(c.id) FILTER (WHERE c.status = 'DRAFT') AS draft_count,
			COUNT(c.id) FILTER (WHERE c.status IN ('PENDING_REVIEW', 'PENDING_PRODUCTION_REVIEW')) AS pending_count,
			COUNT(c.id) FILTER (WHERE c.status = 'APPROVED') AS approved_count,
			COUNT(c.id) FILTER (WHERE c.status = 'PRODUCTION') AS production_count
		FROM planning_periods p
		LEFT JOIN contents c
			ON c.planned_date >= p.start_date
			AND c.planned_date <= p.end_date
			AND COALESCE(c.is_savings, FALSE) = FALSE
		WHERE p.id = $1
		GROUP BY p.id`, id).Scan(
		&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &desc,
		&createdBy, &p.CreatedAt, &p.UpdatedAt,
		&p.TotalContents, &p.PublishedCount, &p.DraftCount,
		&p.PendingCount, &p.ApprovedCount, &p.ProductionCount,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Periode perencanaan tidak ditemukan"})
		return
	}
	p.Description = desc
	p.CreatedBy = createdBy

	// 1. Generate monthly breakdown dynamically from start_date and end_date
	startTime, _ := time.Parse("2006-01-02", p.StartDate)
	endTime, _ := time.Parse("2006-01-02", p.EndDate)

	monthlyBreakdown := []models.MonthBreakdown{}
	if !startTime.IsZero() && !endTime.IsZero() {
		cur := time.Date(startTime.Year(), startTime.Month(), 1, 0, 0, 0, 0, time.UTC)
		for !cur.After(endTime) {
			mKey := cur.Format("2006-01")
			mName := fmt.Sprintf("%s %d", indoMonths[int(cur.Month())], cur.Year())
			mStart := cur.Format("2006-01-02")
			mLastDay := cur.AddDate(0, 1, -1)
			mEnd := mLastDay.Format("2006-01-02")

			var mCount int
			_ = h.Pool.QueryRow(c.Request.Context(), `
				SELECT COUNT(*) FROM contents
				WHERE planned_date >= $1 AND planned_date <= $2
				AND COALESCE(is_savings, FALSE) = FALSE
			`, mStart, mEnd).Scan(&mCount)

			monthlyBreakdown = append(monthlyBreakdown, models.MonthBreakdown{
				MonthKey:   mKey,
				MonthName:  mName,
				StartDate:  mStart,
				EndDate:    mEnd,
				TotalCount: mCount,
			})

			cur = cur.AddDate(0, 1, 0)
		}
	}

	// 2. Fetch contents in this period
	contents, _ := h.queryContents(c.Request.Context(),
		contentSelect+` WHERE c.planned_date >= $1 AND c.planned_date <= $2
		AND COALESCE(c.is_savings, FALSE) = FALSE
		ORDER BY c.planned_date ASC`, p.StartDate, p.EndDate)
	h.attachPublications(c.Request.Context(), contents)

	// 3. Aggregate performance for published contents in this period
	var perf models.PerformanceMetric
	_ = h.Pool.QueryRow(c.Request.Context(), `
		SELECT
			COALESCE(SUM(pm.views), 0),
			COALESCE(SUM(pm.likes), 0),
			COALESCE(SUM(pm.comments), 0),
			COALESCE(SUM(pm.shares), 0),
			COALESCE(SUM(pm.saves), 0),
			COALESCE(SUM(pm.reach), 0)
		FROM performance_metrics pm
		JOIN publications pub ON pub.id = pm.publication_id
		JOIN contents c ON c.id = pub.content_id
		WHERE c.planned_date >= $1 AND c.planned_date <= $2
		AND pub.status = 'PUBLISHED'`, p.StartDate, p.EndDate).Scan(
		&perf.Views, &perf.Likes, &perf.Comments, &perf.Shares, &perf.Saves, &perf.Reach,
	)

	c.JSON(http.StatusOK, gin.H{
		"period":            p,
		"monthly_breakdown": monthlyBreakdown,
		"contents":          contents,
		"performance":       perf,
	})
}

type planningPeriodInput struct {
	Name        string  `json:"name" binding:"required"`
	StartDate   string  `json:"start_date" binding:"required"`
	EndDate     string  `json:"end_date" binding:"required"`
	Status      string  `json:"status"`
	Description *string `json:"description"`
}

// POST /api/planning-periods
func (h *Handler) CreatePlanningPeriod(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat mengelola periode perencanaan"})
		return
	}

	var in planningPeriodInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama, tanggal mulai, dan tanggal selesai wajib diisi"})
		return
	}

	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama periode wajib diisi"})
		return
	}

	sTime, errS := time.Parse("2006-01-02", in.StartDate)
	eTime, errE := time.Parse("2006-01-02", in.EndDate)
	if errS != nil || errE != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}
	if eTime.Before(sTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal selesai tidak boleh sebelum tanggal mulai"})
		return
	}

	status := strings.ToUpper(strings.TrimSpace(in.Status))
	if status == "" {
		status = "DRAFT"
	}
	validStatuses := map[string]bool{
		"DRAFT":      true,
		"AKTIF":      true,
		"SELESAI":    true,
		"DIARSIPKAN": true,
	}
	if !validStatuses[status] {
		status = "DRAFT"
	}

	// Validate overlap
	if conflictMsg, hasOverlap := h.checkPeriodOverlap(c.Request.Context(), in.StartDate, in.EndDate, ""); hasOverlap {
		c.JSON(http.StatusBadRequest, gin.H{"error": conflictMsg})
		return
	}

	// If new period is AKTIF, de-activate other active periods
	if status == "AKTIF" {
		_, _ = h.Pool.Exec(c.Request.Context(), `
			UPDATE planning_periods SET status = 'SELESAI', updated_at = now() WHERE status = 'AKTIF'
		`)
	}

	var newID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO planning_periods (name, start_date, end_date, status, description, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id::TEXT`, in.Name, in.StartDate, in.EndDate, status, in.Description, user.ID).Scan(&newID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan periode perencanaan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Periode perencanaan berhasil dibuat",
		"id":      newID,
	})
}

// PUT /api/planning-periods/:id
func (h *Handler) UpdatePlanningPeriod(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat mengubah periode perencanaan"})
		return
	}

	id := c.Param("id")
	var in planningPeriodInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sTime, errS := time.Parse("2006-01-02", in.StartDate)
	eTime, errE := time.Parse("2006-01-02", in.EndDate)
	if errS != nil || errE != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}
	if eTime.Before(sTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal selesai tidak boleh sebelum tanggal mulai"})
		return
	}

	// Validate overlap
	if conflictMsg, hasOverlap := h.checkPeriodOverlap(c.Request.Context(), in.StartDate, in.EndDate, id); hasOverlap {
		c.JSON(http.StatusBadRequest, gin.H{"error": conflictMsg})
		return
	}

	status := strings.ToUpper(strings.TrimSpace(in.Status))
	if status == "" {
		status = "DRAFT"
	}

	// If status is AKTIF, de-activate others
	if status == "AKTIF" {
		_, _ = h.Pool.Exec(c.Request.Context(), `
			UPDATE planning_periods SET status = 'SELESAI', updated_at = now()
			WHERE status = 'AKTIF' AND id != $1
		`, id)
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE planning_periods
		SET name = $1, start_date = $2, end_date = $3, status = $4, description = $5, updated_at = now()
		WHERE id = $6`, in.Name, in.StartDate, in.EndDate, status, in.Description, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui periode perencanaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Periode perencanaan berhasil diperbarui"})
}

// POST /api/planning-periods/:id/activate
func (h *Handler) ActivatePlanningPeriod(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat mengaktifkan periode"})
		return
	}

	id := c.Param("id")
	// Set all others to SELESAI
	_, _ = h.Pool.Exec(c.Request.Context(), `
		UPDATE planning_periods SET status = 'SELESAI', updated_at = now()
		WHERE status = 'AKTIF' AND id != $1
	`, id)

	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE planning_periods SET status = 'AKTIF', updated_at = now() WHERE id = $1
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengaktifkan periode perencanaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Periode berhasil diaktifkan"})
}

// POST /api/planning-periods/:id/archive
func (h *Handler) ArchivePlanningPeriod(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat mengarsipkan periode"})
		return
	}

	id := c.Param("id")
	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE planning_periods SET status = 'DIARSIPKAN', updated_at = now() WHERE id = $1
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengarsipkan periode perencanaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Periode berhasil diarsipkan"})
}

// DELETE /api/planning-periods/:id
func (h *Handler) DeletePlanningPeriod(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	if user.Role != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Administrator yang dapat menghapus periode"})
		return
	}

	id := c.Param("id")

	// Check if period has contents
	var sDate, eDate string
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT start_date::TEXT, end_date::TEXT FROM planning_periods WHERE id = $1
	`, id).Scan(&sDate, &eDate)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Periode perencanaan tidak ditemukan"})
		return
	}

	var contentCount int
	_ = h.Pool.QueryRow(c.Request.Context(), `
		SELECT COUNT(*) FROM contents
		WHERE planned_date >= $1 AND planned_date <= $2
		AND COALESCE(is_savings, FALSE) = FALSE
	`, sDate, eDate).Scan(&contentCount)

	if contentCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Periode ini sudah memiliki data konten dan tidak dapat dihapus. Gunakan Arsipkan.",
		})
		return
	}

	_, err = h.Pool.Exec(c.Request.Context(), "DELETE FROM planning_periods WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus periode perencanaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Periode perencanaan berhasil dihapus"})
}
