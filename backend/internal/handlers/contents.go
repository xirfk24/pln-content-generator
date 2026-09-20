package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/models"
)

// timeDb is a helper alias for scanning timestamps.
type timeDb = models.Time

const contentSelect = `
SELECT c.id, c.title, c.topic, c.pillar_id, c.category_id, c.platform_id,
       COALESCE(c.platform_ids, '{}') AS platform_ids,
       c.format, c.brief, c.content_purpose,
       COALESCE(c.content_purposes, '{}') AS content_purposes,
       c.posting_category, c.target_audience, c.planned_date::TEXT, c.planned_week, c.day,
       c.brief_link, c.pic, c.priority, c.status,
       COALESCE(c.is_savings, FALSE) AS is_savings,
       c.savings_reason, c.savings_month, c.saved_at,
       c.source_idea_id, c.created_by, c.created_at,
       c.updated_at, c.updated_by,
       pi.id AS pillar_pid, pi.name AS pillar_name, pi.description AS pillar_description, pi.created_at AS pillar_created_at,
       ca.id AS category_cid, ca.name AS category_name, ca.description AS category_description, ca.created_at AS category_created_at,
       pl.id AS platform_plid, pl.name AS platform_name, pl.icon AS platform_icon, pl.created_at AS platform_created_at
FROM contents c
LEFT JOIN pillars pi ON pi.id = c.pillar_id
LEFT JOIN categories ca ON ca.id = c.category_id
LEFT JOIN platforms pl ON pl.id = c.platform_id
`

// canModifyContent is the ownership rule shared by all mutating endpoints:
// ADMIN passes, other roles must be the creator. A nil createdBy (legacy
// rows without a creator) is treated as modifiable by any authenticated user.
func canModifyContent(role string, createdBy *string, userID string) bool {
	if role == "ADMIN" {
		return true
	}
	if createdBy == nil {
		return true
	}
	return *createdBy == userID
}

// requireContentAccess enforces ownership on the content row with the given
// id using canModifyContent. It writes the HTTP error response itself and
// returns false when access is denied or the content does not exist.
func (h *Handler) requireContentAccess(c *gin.Context, user *models.Profile, id string) bool {
	var createdBy *string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT created_by FROM contents WHERE id = $1", id).Scan(&createdBy)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return false
	}
	if !canModifyContent(user.Role, createdBy, user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki izin mengubah konten ini"})
		return false
	}
	return true
}

// GET /api/contents
func (h *Handler) ListContents(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	where := []string{"TRUE"}
	args := []any{}

	// Data privacy: STAFF users only see their own content
	if user.Role != "ADMIN" {
		args = append(args, user.ID)
		where = append(where, "c.created_by = $"+itoa(len(args)))
	}

	// Tabungan filter
	if c.Query("is_savings") == "true" || c.Query("tabungan") == "true" {
		where = append(where, "COALESCE(c.is_savings, FALSE) = TRUE")
	} else if c.Query("include_savings") != "true" {
		where = append(where, "COALESCE(c.is_savings, FALSE) = FALSE")
	}

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		idx := itoa(len(args))
		where = append(where, "(LOWER(c.title) LIKE $"+idx+" OR LOWER(c.topic) LIKE $"+idx+" OR LOWER(COALESCE(c.pic, '')) LIKE $"+idx+")")
	}
	if v := c.Query("pillar_id"); v != "" {
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "(c.pillar_id::TEXT = $"+idx+" OR LOWER(pi.name) = LOWER($"+idx+") OR pi.name ILIKE $"+idx+")")
	}
	if v := c.Query("platform_id"); v != "" {
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "(c.platform_id::TEXT = $"+idx+" OR $"+idx+" = ANY(c.platform_ids) OR LOWER(pl.name) = LOWER($"+idx+"))")
	}
	if v := c.Query("category_id"); v != "" {
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "(c.category_id::TEXT = $"+idx+" OR LOWER(ca.name) = LOWER($"+idx+"))")
	}
	if v := c.Query("status"); v != "" {
		if v == "PLANNED" {
			v = "DRAFT"
		}
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "(c.status = $"+idx+" OR ($"+idx+" = 'DRAFT' AND c.status = 'PLANNED'))")
	}
	if v := c.Query("date_from"); v != "" {
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "c.planned_date >= $"+idx+"::DATE")
	}
	if v := c.Query("date_to"); v != "" {
		args = append(args, v)
		idx := itoa(len(args))
		where = append(where, "c.planned_date <= $"+idx+"::DATE")
	}

	// Sorting
	sortBy := c.DefaultQuery("sort_by", "planned_date")
	order := strings.ToUpper(c.DefaultQuery("order", "ASC"))
	if order != "DESC" && order != "ASC" {
		order = "ASC"
	}

	orderBy := "c.planned_date ASC NULLS LAST, c.created_at DESC"
	switch sortBy {
	case "created_at":
		if order == "ASC" {
			orderBy = "c.created_at ASC"
		} else {
			orderBy = "c.created_at DESC"
		}
	case "updated_at":
		if order == "ASC" {
			orderBy = "c.updated_at ASC"
		} else {
			orderBy = "c.updated_at DESC"
		}
	default: // "planned_date"
		if order == "DESC" {
			orderBy = "c.planned_date DESC NULLS LAST, c.created_at DESC"
		} else {
			orderBy = "c.planned_date ASC NULLS LAST, c.created_at DESC"
		}
	}

	query := contentSelect + " WHERE " + strings.Join(where, " AND ") + " ORDER BY " + orderBy
	contents, err := h.queryContents(c.Request.Context(), query, args...)
	if err != nil {
		log.Printf("listContents error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar konten"})
		return
	}

	// attach publications
	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"contents": contents})
}

// GET /api/contents/calendar
func (h *Handler) Calendar(c *gin.Context) {
	where := []string{"c.planned_date IS NOT NULL", "COALESCE(c.is_savings, FALSE) = FALSE"}
	args := []any{}
	if v := c.Query("date_from"); v != "" {
		args = append(args, v)
		where = append(where, "c.planned_date >= $"+itoa(len(args)))
	}
	if v := c.Query("date_to"); v != "" {
		args = append(args, v)
		where = append(where, "c.planned_date <= $"+itoa(len(args)))
	}
	query := contentSelect + " WHERE " + strings.Join(where, " AND ") + " ORDER BY c.planned_date ASC"
	contents, err := h.queryContents(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kalender"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"contents": contents})
}

// GET /api/contents/:id
func (h *Handler) GetContent(c *gin.Context) {
	id := c.Param("id")
	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"content": contents[0]})
}

type contentInput struct {
	Title           *string  `json:"title"`
	Topic           *string  `json:"topic"`
	PillarID        *string  `json:"pillar_id"`
	CategoryID      *string  `json:"category_id"`
	PlatformID      *string  `json:"platform_id"`
	PlatformIDs     []string `json:"platform_ids"`
	Format          *string  `json:"format"`
	Brief           *string  `json:"brief"`
	ContentPurpose  *string  `json:"content_purpose"`
	ContentPurposes []string `json:"content_purposes"`
	PostingCategory *string  `json:"posting_category"`
	TargetAudience  *string  `json:"target_audience"`
	PlannedDate     *string  `json:"planned_date"`
	PlannedWeek     *int     `json:"planned_week"`
	BriefLink       *string  `json:"brief_link"`
	Pic             *string  `json:"pic"`
	Priority        *string  `json:"priority"`
	SourceIdeaID    *string  `json:"source_idea_id"`
	IsSavings       *bool    `json:"is_savings"`
	SavingsReason   *string  `json:"savings_reason"`
	SavingsMonth    *string  `json:"savings_month"`
}

// POST /api/contents
func (h *Handler) CreateContent(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var in contentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if in.Title == nil || strings.TrimSpace(*in.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Judul konten wajib diisi"})
		return
	}
	if in.Topic == nil || strings.TrimSpace(*in.Topic) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Topik konten wajib diisi"})
		return
	}

	title := strings.TrimSpace(*in.Title)
	topic := strings.TrimSpace(*in.Topic)

	var plannedWeek *int
	var day *string
	var plannedDate *string
	if in.PlannedDate != nil && strings.TrimSpace(*in.PlannedDate) != "" {
		pDate := strings.TrimSpace(*in.PlannedDate)
		if t, ok := parseDateStr(pDate); ok {
			formatted := t.Format("2006-01-02")
			plannedDate = &formatted
			w := weekNumber(t)
			plannedWeek = &w
		}
		if d, ok := dayName(pDate); ok {
			day = &d
		}
	}
	if in.PlannedWeek != nil {
		plannedWeek = in.PlannedWeek
	}

	// Resolve pillar & category
	pillarID := h.resolvePillarID(c.Request.Context(), in.PillarID)
	categoryID := h.resolveCategoryID(c.Request.Context(), in.CategoryID)

	// Multi-platform sync & resolution
	var platformIDs []string
	if len(in.PlatformIDs) > 0 {
		for _, pid := range in.PlatformIDs {
			if resolved := h.resolvePlatformID(c.Request.Context(), &pid); resolved != nil {
				platformIDs = append(platformIDs, *resolved)
			}
		}
	} else if in.PlatformID != nil && strings.TrimSpace(*in.PlatformID) != "" {
		if resolved := h.resolvePlatformID(c.Request.Context(), in.PlatformID); resolved != nil {
			platformIDs = append(platformIDs, *resolved)
		}
	}

	var primaryPlatformID *string
	if len(platformIDs) > 0 {
		primaryPlatformID = &platformIDs[0]
	}

	// Multi-purpose sync
	var contentPurposes []string
	if len(in.ContentPurposes) > 0 {
		for _, cp := range in.ContentPurposes {
			if trimmed := strings.TrimSpace(cp); trimmed != "" {
				contentPurposes = append(contentPurposes, trimmed)
			}
		}
	} else if in.ContentPurpose != nil && strings.TrimSpace(*in.ContentPurpose) != "" {
		contentPurposes = []string{strings.TrimSpace(*in.ContentPurpose)}
	}
	var primaryPurpose *string
	if len(contentPurposes) > 0 {
		primaryPurpose = &contentPurposes[0]
	}

	isSavings := false
	if in.IsSavings != nil {
		isSavings = *in.IsSavings
	}

	format := "Feed/Photo"
	if in.Format != nil && strings.TrimSpace(*in.Format) != "" {
		format = strings.TrimSpace(*in.Format)
	}

	var id string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO contents (title, topic, pillar_id, category_id, platform_id, platform_ids, format,
			brief, content_purpose, content_purposes, posting_category, target_audience, planned_date, planned_week, day,
			brief_link, pic, priority, source_idea_id, is_savings, savings_reason, savings_month, created_by, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'DRAFT')
		RETURNING id
	`, title, topic, pillarID, categoryID, primaryPlatformID, platformIDs, format,
		cleanStr(in.Brief), primaryPurpose, contentPurposes, cleanStr(in.PostingCategory), cleanStr(in.TargetAudience), plannedDate, plannedWeek, day,
		cleanStr(in.BriefLink), cleanStr(in.Pic), cleanStr(in.Priority), cleanUUIDStr(in.SourceIdeaID), isSavings, cleanStr(in.SavingsReason), cleanStr(in.SavingsMonth), user.ID).Scan(&id)
	if err != nil {
		log.Printf("CreateContent error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan konten baru"})
		return
	}

	// Catat di history
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, 'CREATED', NULL, 'DRAFT', 'Konten baru dibuat sebagai Draft', $2)
	`, id, user.ID)

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat konten yang baru dibuat"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Konten berhasil dibuat"})
}

// PUT /api/contents/:id
func (h *Handler) UpdateContent(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")

	// 1. Cek status saat ini dan hak akses penguncian
	var currentStatus string
	var createdBy *string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT status, created_by FROM contents WHERE id = $1", id).Scan(&currentStatus, &createdBy)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}

	// ATURAN PENGUNCIAN: Status Menunggu Persetujuan, Disetujui, Siap Publikasi, dan Dipublikasikan TIDAK boleh diedit
	if currentStatus == "PENDING_REVIEW" || currentStatus == "APPROVED" || currentStatus == "READY_TO_PUBLISH" || currentStatus == "PUBLISHED" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Konten dengan status '" + currentStatus + "' terkunci dari pengeditan data utama.",
		})
		return
	}

	// Hak kepemilikan data: STAFF hanya boleh mengedit miliknya sendiri jika draft/dalam proses
	if !canModifyContent(user.Role, createdBy, user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki izin mengedit konten milik pengguna lain"})
		return
	}

	var in contentInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	setClauses := []string{"updated_at = now()", "updated_by = $1"}
	args := []any{user.ID}

	add := func(col string, val any) {
		args = append(args, val)
		setClauses = append(setClauses, col+" = $"+itoa(len(args)))
	}

	if in.Title != nil {
		add("title", strings.TrimSpace(*in.Title))
	}
	if in.Topic != nil {
		add("topic", strings.TrimSpace(*in.Topic))
	}
	if in.PillarID != nil {
		resolved := h.resolvePillarID(c.Request.Context(), in.PillarID)
		add("pillar_id", resolved)
	}
	if in.CategoryID != nil {
		resolved := h.resolveCategoryID(c.Request.Context(), in.CategoryID)
		add("category_id", resolved)
	}
	if in.PlatformIDs != nil {
		var resolvedIDs []string
		for _, pid := range in.PlatformIDs {
			if res := h.resolvePlatformID(c.Request.Context(), &pid); res != nil {
				resolvedIDs = append(resolvedIDs, *res)
			}
		}
		add("platform_ids", resolvedIDs)
		if len(resolvedIDs) > 0 {
			add("platform_id", resolvedIDs[0])
		} else {
			add("platform_id", nil)
		}
	} else if in.PlatformID != nil {
		resolved := h.resolvePlatformID(c.Request.Context(), in.PlatformID)
		add("platform_id", resolved)
		if resolved != nil {
			add("platform_ids", []string{*resolved})
		}
	}
	if in.Format != nil {
		add("format", strings.TrimSpace(*in.Format))
	}
	if in.Brief != nil {
		add("brief", cleanStr(in.Brief))
	}
	if in.ContentPurposes != nil {
		var purposes []string
		for _, p := range in.ContentPurposes {
			if t := strings.TrimSpace(p); t != "" {
				purposes = append(purposes, t)
			}
		}
		add("content_purposes", purposes)
		if len(purposes) > 0 {
			add("content_purpose", purposes[0])
		} else {
			add("content_purpose", nil)
		}
	} else if in.ContentPurpose != nil {
		t := cleanStr(in.ContentPurpose)
		add("content_purpose", t)
		if t != nil {
			add("content_purposes", []string{*t})
		}
	}
	if in.PostingCategory != nil {
		add("posting_category", cleanStr(in.PostingCategory))
	}
	if in.TargetAudience != nil {
		add("target_audience", cleanStr(in.TargetAudience))
	}
	if in.PlannedDate != nil {
		var plannedDate *string
		if t, ok := parseDateStr(strings.TrimSpace(*in.PlannedDate)); ok {
			formatted := t.Format("2006-01-02")
			plannedDate = &formatted
			w := weekNumber(t)
			add("planned_week", w)
			if d, ok2 := dayName(*plannedDate); ok2 {
				add("day", d)
			}
		} else {
			add("planned_week", nil)
			add("day", nil)
		}
		add("planned_date", plannedDate)
	}
	if in.PlannedWeek != nil {
		add("planned_week", *in.PlannedWeek)
	}
	if in.BriefLink != nil {
		add("brief_link", cleanStr(in.BriefLink))
	}
	if in.Pic != nil {
		add("pic", cleanStr(in.Pic))
	}
	if in.Priority != nil {
		add("priority", cleanStr(in.Priority))
	}
	if in.SourceIdeaID != nil {
		add("source_idea_id", cleanUUIDStr(in.SourceIdeaID))
	}
	if in.IsSavings != nil {
		add("is_savings", *in.IsSavings)
	}
	if in.SavingsReason != nil {
		add("savings_reason", cleanStr(in.SavingsReason))
	}
	if in.SavingsMonth != nil {
		add("savings_month", cleanStr(in.SavingsMonth))
	}

	args = append(args, id)
	res, err := h.Pool.Exec(c.Request.Context(),
		"UPDATE contents SET "+strings.Join(setClauses, ", ")+" WHERE id = $"+itoa(len(args)), args...)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui konten"})
		return
	}

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Perubahan konten berhasil disimpan"})
}

// DELETE /api/contents/:id
func (h *Handler) DeleteContent(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	id := c.Param("id")

	var currentStatus string
	var createdBy *string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT status, created_by FROM contents WHERE id = $1", id).Scan(&currentStatus, &createdBy)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}

	// Status yang terkunci tidak boleh dihapus sembarangan
	if currentStatus == "PENDING_REVIEW" || currentStatus == "APPROVED" || currentStatus == "PUBLISHED" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Konten dengan status " + currentStatus + " sedang aktif di workflow dan tidak dapat dihapus"})
		return
	}

	if !canModifyContent(user.Role, createdBy, user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki izin menghapus konten ini"})
		return
	}

	res, err := h.Pool.Exec(c.Request.Context(), "DELETE FROM contents WHERE id = $1", id)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus konten"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Konten berhasil dihapus"})
}

// GET /api/contents/:id/details
func (h *Handler) ContentDetails(c *gin.Context) {
	id := c.Param("id")

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", id)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}
	content := contents[0]

	// publications with platform + metrics
	pubQuery := `
		SELECT p.id, p.content_id, p.platform_id, p.planned_publish_date::TEXT, p.actual_publish_date::TEXT,
		       p.url, p.status, p.notes, p.created_at, p.updated_at
		FROM publications p WHERE p.content_id = $1 ORDER BY p.planned_publish_date ASC`
	publications, pubIDs := h.queryPublications(c.Request.Context(), pubQuery, id)
	content.Publications = publications
	h.attachMetrics(c.Request.Context(), publications, pubIDs)

	// approval histories with performer
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT ah.id, ah.content_id, ah.action, ah.from_status, ah.to_status, ah.comment,
		       ah.performed_by, ah.performed_at,
		       pr.id, pr.email, pr.full_name, pr.role, pr.is_active, pr.created_at, pr.updated_at
		FROM approval_histories ah
		LEFT JOIN profiles pr ON pr.id = ah.performed_by
		WHERE ah.content_id = $1
		ORDER BY ah.performed_at ASC
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat persetujuan"})
		return
	}
	defer rows.Close()

	approvals := []models.ApprovalHistory{}
	for rows.Next() {
		var ah models.ApprovalHistory
		var performerID, performerEmail *string
		var performerFullName *string
		var performerRole *string
		var performerActive *bool
		var performerCreatedAt, performerUpdatedAt *timeDb
		if err := rows.Scan(&ah.ID, &ah.ContentID, &ah.Action, &ah.FromStatus, &ah.ToStatus,
			&ah.Comment, &ah.PerformedBy, &ah.PerformedAt,
			&performerID, &performerEmail, &performerFullName, &performerRole, &performerActive,
			&performerCreatedAt, &performerUpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses riwayat persetujuan"})
			return
		}
		if performerID != nil {
			ah.Performer = &models.Profile{
				ID: *performerID, Email: derefString(performerEmail), FullName: performerFullName,
				Role: derefString(performerRole), IsActive: performerActive,
			}
		}
		approvals = append(approvals, ah)
	}

	c.JSON(http.StatusOK, gin.H{"content": content, "approvals": approvals, "publications": publications})
}

// queryContents runs a flat-join query and assembles nested Content objects.
func (h *Handler) queryContents(ctx context.Context, query string, args ...any) ([]models.Content, error) {
	rows, err := h.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Content{}
	for rows.Next() {
		var ct models.Content
		var pid, cid, plid *string
		var pn, pd, pcatn, pcatd, pln, pli *string
		var pCreated, cCreated, plCreated *timeDb
		var platformIDs, contentPurposes []string
		var isSavings bool
		var savingsReason, savingsMonth *string
		var savedAt *time.Time

		if err := rows.Scan(&ct.ID, &ct.Title, &ct.Topic, &ct.PillarID, &ct.CategoryID, &ct.PlatformID,
			&platformIDs, &ct.Format, &ct.Brief, &ct.ContentPurpose,
			&contentPurposes, &ct.PostingCategory, &ct.TargetAudience,
			&ct.PlannedDate, &ct.PlannedWeek, &ct.Day,
			&ct.BriefLink, &ct.Pic, &ct.Priority, &ct.Status,
			&isSavings, &savingsReason, &savingsMonth, &savedAt,
			&ct.SourceIdeaID, &ct.CreatedBy,
			&ct.CreatedAt, &ct.UpdatedAt, &ct.UpdatedBy,
			&pid, &pn, &pd, &pCreated,
			&cid, &pcatn, &pcatd, &cCreated,
			&plid, &pln, &pli, &plCreated); err != nil {
			log.Printf("queryContents scan error: %v", err)
			return nil, err
		}

		ct.PlatformIDs = platformIDs
		ct.ContentPurposes = contentPurposes
		ct.IsSavings = isSavings
		ct.SavingsReason = savingsReason
		ct.SavingsMonth = savingsMonth
		ct.SavedAt = savedAt

		if pid != nil {
			ct.Pillar = &models.Pillar{ID: *pid, Name: derefString(pn), Description: pd, CreatedAt: derefTime(pCreated)}
		}
		if cid != nil {
			ct.Category = &models.Category{ID: *cid, Name: derefString(pcatn), Description: pcatd, CreatedAt: derefTime(cCreated)}
		}
		if plid != nil {
			ct.Platform = &models.Platform{ID: *plid, Name: derefString(pln), Icon: pli, CreatedAt: derefTime(plCreated)}
		}
		out = append(out, ct)
	}
	return out, rows.Err()
}

// queryPublications fetches publications (+platform) and returns them plus their ids.
func (h *Handler) queryPublications(ctx context.Context, query string, args ...any) ([]models.Publication, []string) {
	rows, err := h.Pool.Query(ctx, `
		SELECT p.id, p.content_id, p.platform_id, p.planned_publish_date::TEXT, p.actual_publish_date::TEXT,
		       p.url, p.status, p.notes, p.created_at, p.updated_at,
		       pl.id, pl.name, pl.icon, pl.created_at
		FROM publications p
		LEFT JOIN platforms pl ON pl.id = p.platform_id
		WHERE `+query+`
		ORDER BY p.planned_publish_date ASC`, args...)
	if err != nil {
		return []models.Publication{}, nil
	}
	defer rows.Close()

	out := []models.Publication{}
	ids := []string{}
	for rows.Next() {
		var p models.Publication
		var plID, plName, plIcon *string
		var plCreated *timeDb
		if err := rows.Scan(&p.ID, &p.ContentID, &p.PlatformID, &p.PlannedPublishDate, &p.ActualPublishDate,
			&p.URL, &p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
			&plID, &plName, &plIcon, &plCreated); err != nil {
			continue
		}
		if plID != nil {
			p.Platform = &models.Platform{ID: *plID, Name: derefString(plName), Icon: plIcon, CreatedAt: derefTime(plCreated)}
		}
		out = append(out, p)
		ids = append(ids, p.ID)
	}
	return out, ids
}

func (h *Handler) attachPublications(ctx context.Context, contents []models.Content) {
	if len(contents) == 0 {
		return
	}
	ids := make([]string, len(contents))
	for i, ct := range contents {
		ids[i] = ct.ID
	}
	_, pubByContent := h.publicationsForContents(ctx, ids)
	for i := range contents {
		if pubs, ok := pubByContent[contents[i].ID]; ok {
			contents[i].Publications = pubs
		} else {
			contents[i].Publications = []models.Publication{}
		}
	}
}

func (h *Handler) publicationsForContents(ctx context.Context, contentIDs []string) ([]models.Publication, map[string][]models.Publication) {
	if len(contentIDs) == 0 {
		return []models.Publication{}, map[string][]models.Publication{}
	}
	rows, err := h.Pool.Query(ctx, `
		SELECT p.id, p.content_id, p.platform_id, p.planned_publish_date::TEXT, p.actual_publish_date::TEXT,
		       p.url, p.status, p.notes, p.created_at, p.updated_at,
		       pl.id, pl.name, pl.icon, pl.created_at
		FROM publications p
		LEFT JOIN platforms pl ON pl.id = p.platform_id
		WHERE p.content_id = ANY($1)
		ORDER BY p.planned_publish_date ASC`, contentIDs)
	if err != nil {
		return []models.Publication{}, map[string][]models.Publication{}
	}
	defer rows.Close()

	all := []models.Publication{}
	byContent := map[string][]models.Publication{}
	for rows.Next() {
		var p models.Publication
		var plID, plName, plIcon *string
		var plCreated *timeDb
		if err := rows.Scan(&p.ID, &p.ContentID, &p.PlatformID, &p.PlannedPublishDate, &p.ActualPublishDate,
			&p.URL, &p.Status, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
			&plID, &plName, &plIcon, &plCreated); err != nil {
			continue
		}
		if plID != nil {
			p.Platform = &models.Platform{ID: *plID, Name: derefString(plName), Icon: plIcon, CreatedAt: derefTime(plCreated)}
		}
		all = append(all, p)
		byContent[p.ContentID] = append(byContent[p.ContentID], p)
	}
	return all, byContent
}

// attachMetrics loads performance metrics for the given publication ids.
func (h *Handler) attachMetrics(ctx context.Context, publications []models.Publication, pubIDs []string) {
	if len(pubIDs) == 0 {
		return
	}
	rows, err := h.Pool.Query(ctx, `
		SELECT id, publication_id, views, likes, comments, shares, saves, reach, recorded_at::TEXT, created_at
		FROM performance_metrics WHERE publication_id = ANY($1)
		ORDER BY recorded_at ASC`, pubIDs)
	if err != nil {
		return
	}
	defer rows.Close()

	byPub := map[string][]models.PerformanceMetric{}
	for rows.Next() {
		var m models.PerformanceMetric
		if err := rows.Scan(&m.ID, &m.PublicationID, &m.Views, &m.Likes, &m.Comments,
			&m.Shares, &m.Saves, &m.Reach, &m.RecordedAt, &m.CreatedAt); err != nil {
			continue
		}
		byPub[m.PublicationID] = append(byPub[m.PublicationID], m)
	}
	for i := range publications {
		if ms, ok := byPub[publications[i].ID]; ok {
			publications[i].PerformanceMetrics = ms
		} else {
			publications[i].PerformanceMetrics = []models.PerformanceMetric{}
		}
	}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefTime(t *timeDb) models.Time {
	if t == nil {
		return models.Time{}
	}
	return *t
}

// nullable returns nil for empty strings (mirrors optional JSON fields).
func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func cleanStr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func cleanUUIDStr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func (h *Handler) resolvePillarID(ctx context.Context, val *string) *string {
	if val == nil {
		return nil
	}
	v := strings.TrimSpace(*val)
	if v == "" {
		return nil
	}
	// 1. Check if it's already an existing pillar ID or exact name in pillars table
	var id string
	err := h.Pool.QueryRow(ctx, "SELECT id FROM pillars WHERE id::TEXT = $1 OR LOWER(name) = LOWER($1) LIMIT 1", v).Scan(&id)
	if err == nil {
		return &id
	}
	// 2. Fuzzy prefix check
	err = h.Pool.QueryRow(ctx, "SELECT id FROM pillars WHERE name ILIKE $1 OR $1 ILIKE (name || '%') LIMIT 1", v+"%").Scan(&id)
	if err == nil {
		return &id
	}
	// 3. If looks like a valid UUID (len 36 and contains 4 hyphens)
	if len(v) == 36 && strings.Count(v, "-") == 4 {
		return &v
	}
	return nil
}

func (h *Handler) resolveCategoryID(ctx context.Context, val *string) *string {
	if val == nil {
		return nil
	}
	v := strings.TrimSpace(*val)
	if v == "" {
		return nil
	}
	var id string
	err := h.Pool.QueryRow(ctx, "SELECT id FROM categories WHERE id::TEXT = $1 OR LOWER(name) = LOWER($1) LIMIT 1", v).Scan(&id)
	if err == nil {
		return &id
	}
	if len(v) == 36 && strings.Count(v, "-") == 4 {
		return &v
	}
	return nil
}

func (h *Handler) resolvePlatformID(ctx context.Context, val *string) *string {
	if val == nil {
		return nil
	}
	v := strings.TrimSpace(*val)
	if v == "" {
		return nil
	}
	var id string
	err := h.Pool.QueryRow(ctx, "SELECT id FROM platforms WHERE id::TEXT = $1 OR LOWER(name) = LOWER($1) LIMIT 1", v).Scan(&id)
	if err == nil {
		return &id
	}
	if len(v) == 36 && strings.Count(v, "-") == 4 {
		return &v
	}
	return nil
}
