package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GET /api/tabungan — Ambil daftar konten tabungan
func (h *Handler) ListTabungan(c *gin.Context) {
	where := []string{"COALESCE(c.is_savings, FALSE) = TRUE"}
	args := []any{}

	if search := c.Query("search"); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = append(where, "(LOWER(c.title) LIKE $"+itoa(len(args))+" OR LOWER(c.topic) LIKE $"+itoa(len(args))+")")
	}
	if v := c.Query("pillar_id"); v != "" {
		args = append(args, v)
	}
	if v := c.Query("category_id"); v != "" {
		args = append(args, v)
		where = append(where, "c.category_id = $"+itoa(len(args)))
	}
	if v := c.Query("month"); v != "" {
		// month formatted as YYYY-MM or substring of planned_date / savings_month
		args = append(args, v+"%")
		where = append(where, "(c.savings_month LIKE $"+itoa(len(args))+" OR c.planned_date::TEXT LIKE $"+itoa(len(args))+")")
	}

	query := contentSelect + " WHERE " + strings.Join(where, " AND ") + " ORDER BY COALESCE(c.saved_at, c.updated_at) DESC"
	contents, err := h.queryContents(c.Request.Context(), query, args...)
	if err != nil {
		log.Printf("listTabungan error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar konten tabungan"})
		return
	}

	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"contents": contents})
}

type moveTabunganInput struct {
	PlannedDate *string `json:"planned_date"`
	Reason      *string `json:"reason"`
}

// POST /api/tabungan/:id/move-to-plan — Kembalikan ke Rencana Konten
func (h *Handler) MoveToPlan(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")
	if !h.requireContentAccess(c, user, id) {
		return
	}

	var in moveTabunganInput
	_ = c.ShouldBindJSON(&in)

	var plannedWeek *int
	var day *string
	if in.PlannedDate != nil && *in.PlannedDate != "" {
		if t, ok := parseDateStr(*in.PlannedDate); ok {
			w := weekNumber(t)
			plannedWeek = &w
		}
		if d, ok := dayName(*in.PlannedDate); ok {
			day = &d
		}
	}

	query := `
		UPDATE contents
		SET is_savings = FALSE,
		    status = CASE WHEN status = 'DRAFT' THEN 'DRAFT' ELSE 'IN_PROGRESS' END,
		    planned_date = COALESCE($1, planned_date),
		    planned_week = COALESCE($2, planned_week),
		    day = COALESCE($3, day),
		    updated_at = now(),
		    updated_by = $4
		WHERE id = $5 RETURNING id
	`
	var updatedID string
	err := h.Pool.QueryRow(c.Request.Context(), query, in.PlannedDate, plannedWeek, day, user.ID, id).Scan(&updatedID)
	if err != nil {
		log.Printf("MoveToPlan error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindahkan konten ke Rencana Konten"})
		return
	}

	// Catat di history
	comment := "Konten dipindahkan kembali dari Konten Tabungan ke Rencana Konten"
	if in.Reason != nil && *in.Reason != "" {
		comment += ": " + *in.Reason
	}
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, 'RESCHEDULED', 'TABUNGAN', 'IN_PROGRESS', $2, $3)
	`, id, comment, user.ID)

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Berhasil dipindahkan ke Rencana Konten"})
}

type rescheduleTabunganInput struct {
	PlannedDate string  `json:"planned_date" binding:"required"`
	ToPlan      bool    `json:"to_plan"`
	Reason      *string `json:"reason"`
}

// POST /api/tabungan/:id/reschedule — Jadwalkan Ulang Konten
func (h *Handler) RescheduleTabungan(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")
	if !h.requireContentAccess(c, user, id) {
		return
	}

	var in rescheduleTabunganInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal publikasi baru wajib diisi"})
		return
	}
	// Tanggal harus format valid (YYYY-MM-DD / RFC3339) — sebelumnya string
	// mentah masuk kolom date.
	if _, ok := parseDateStr(in.PlannedDate); !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid. Gunakan format YYYY-MM-DD (contoh: 2026-09-15)"})
		return
	}

	var plannedWeek *int
	var day *string
	if t, ok := parseDateStr(in.PlannedDate); ok {
		w := weekNumber(t)
		plannedWeek = &w
	}
	if d, ok := dayName(in.PlannedDate); ok {
		day = &d
	}

	isSavings := !in.ToPlan
	status := "IN_PROGRESS"
	if isSavings {
		status = "RESCHEDULED"
	}

	query := `
		UPDATE contents
		SET planned_date = $1,
		    planned_week = $2,
		    day = $3,
		    is_savings = $4,
		    status = $5,
		    updated_at = now(),
		    updated_by = $6
		WHERE id = $7 RETURNING id
	`
	var updatedID string
	err := h.Pool.QueryRow(c.Request.Context(), query, in.PlannedDate, plannedWeek, day, isSavings, status, user.ID, id).Scan(&updatedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menjadwalkan ulang konten"})
		return
	}

	comment := "Konten dijadwalkan ulang ke tanggal " + in.PlannedDate
	if in.Reason != nil && *in.Reason != "" {
		comment += " (Alasan: " + *in.Reason + ")"
	}
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, 'RESCHEDULED', 'TABUNGAN', $2, $3, $4)
	`, id, status, comment, user.ID)

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Berhasil menjadwalkan ulang konten"})
}

type saveToTabunganInput struct {
	Reason string `json:"reason"`
	Month  string `json:"month"`
}

// POST /api/contents/:id/move-to-tabungan — Pindahkan konten ke Konten Tabungan
func (h *Handler) MoveToTabungan(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")
	if !h.requireContentAccess(c, user, id) {
		return
	}

	var in saveToTabunganInput
	_ = c.ShouldBindJSON(&in)

	savingsMonth := in.Month
	if savingsMonth == "" {
		savingsMonth = time.Now().Format("2006-01")
	}

	query := `
		UPDATE contents
		SET is_savings = TRUE,
		    savings_reason = $1,
		    savings_month = $2,
		    saved_at = now(),
		    updated_at = now(),
		    updated_by = $3
		WHERE id = $4 RETURNING id
	`
	var updatedID string
	err := h.Pool.QueryRow(c.Request.Context(), query, in.Reason, savingsMonth, user.ID, id).Scan(&updatedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindahkan ke Konten Tabungan"})
		return
	}

	comment := "Konten disimpan ke Konten Tabungan"
	if in.Reason != "" {
		comment += ": " + in.Reason
	}
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, 'SAVED_TO_TABUNGAN', 'IN_PROGRESS', 'TABUNGAN', $2, $3)
	`, id, comment, user.ID)

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Konten berhasil disimpan ke Konten Tabungan"})
}
