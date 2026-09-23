package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/models"
)

// Workflow action definitions
type workflowActionDef struct {
	Label                  string
	AllowedRoles           []string
	AllowedFromStatuses    []string
	ToStatus               string
	RequiresComment        bool
	RequiresProductionLink bool
}

// Workflow Actions Map (v2)
var workflowActions = map[string]workflowActionDef{
	"SUBMITTED": {
		Label:               "Ajukan Konsep",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"DRAFT", "REVISION_REQUIRED"},
		ToStatus:            "PENDING_REVIEW",
		RequiresComment:     false,
	},
	"RESUBMITTED": {
		Label:               "Ajukan Ulang Konsep",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"REVISION_REQUIRED", "DRAFT"},
		ToStatus:            "PENDING_REVIEW",
		RequiresComment:     false,
	},
	"APPROVED": {
		Label:               "Setujui Konsep",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "APPROVED",
		RequiresComment:     false,
	},
	"CONCEPT_REVISION_REQUESTED": {
		Label:               "Minta Revisi Konsep",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "REVISION_REQUIRED",
		RequiresComment:     true,
	},
	"START_PRODUCTION": {
		Label:               "Mulai Produksi Konten",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"APPROVED"},
		ToStatus:            "PRODUCTION",
		RequiresComment:     false,
	},
	"PRODUCTION_SUBMITTED": {
		Label:                  "Setor Hasil Produksi",
		AllowedRoles:           []string{"ADMIN", "STAFF"},
		AllowedFromStatuses:    []string{"PRODUCTION", "REVISION_REQUIRED"},
		ToStatus:               "PENDING_PRODUCTION_REVIEW",
		RequiresComment:        false,
		RequiresProductionLink: true,
	},
	"PRODUCTION_APPROVED": {
		Label:               "Setujui Produksi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_PRODUCTION_REVIEW"},
		ToStatus:            "READY_TO_PUBLISH",
		RequiresComment:     false,
	},
	"PRODUCTION_REVISION_REQUESTED": {
		Label:               "Minta Revisi Hasil Produksi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_PRODUCTION_REVIEW"},
		ToStatus:            "REVISION_REQUIRED",
		RequiresComment:     true,
	},
	"SHORTCUT_READY": {
		Label:               "Langsung Siap Publikasi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW", "APPROVED"},
		ToStatus:            "READY_TO_PUBLISH",
		RequiresComment:     false,
	},
	"MARK_PUBLISHED": {
		Label:               "Tandai Dipublikasikan",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"READY_TO_PUBLISH"},
		ToStatus:            "PUBLISHED",
		RequiresComment:     false,
	},
	"REVISION_FROM_READY": {
		Label:               "Minta Revisi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"READY_TO_PUBLISH"},
		ToStatus:            "REVISION_REQUIRED",
		RequiresComment:     true,
	},
	"REJECTED": {
		Label:               "Tolak Konten",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW", "APPROVED", "PRODUCTION", "PENDING_PRODUCTION_REVIEW", "READY_TO_PUBLISH", "REVISION_REQUIRED"},
		ToStatus:            "REJECTED",
		RequiresComment:     true,
	},
}

var approvalQueueStatuses = map[string][]string{
	"ADMIN": {"PENDING_REVIEW", "PENDING_PRODUCTION_REVIEW"},
	"STAFF": {},
}

type workflowBody struct {
	Action         string  `json:"action" binding:"required"`
	Comment        *string `json:"comment"`
	ProductionLink *string `json:"production_link"`
}

// POST /api/contents/:id/workflow
func (h *Handler) WorkflowAction(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}
	contentID := c.Param("id")

	var body workflowBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aksi workflow wajib ditentukan"})
		return
	}

	def, ok := workflowActions[body.Action]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aksi workflow tidak dikenal: " + body.Action})
		return
	}

	comment := ""
	if body.Comment != nil {
		comment = strings.TrimSpace(*body.Comment)
	}
	if def.RequiresComment && comment == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Komentar/catatan revisi wajib diisi untuk aksi ini"})
		return
	}

	prodLink := ""
	if body.ProductionLink != nil {
		prodLink = strings.TrimSpace(*body.ProductionLink)
	}
	if def.RequiresProductionLink && prodLink == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tautan hasil produksi (production_link) wajib diisi untuk aksi Setor Hasil Produksi"})
		return
	}

	if !containsRole(def.AllowedRoles, user.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role " + user.Role + " tidak memiliki izin untuk melakukan aksi " + def.Label})
		return
	}

	var fromStatus string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT status FROM contents WHERE id = $1", contentID).Scan(&fromStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Konten tidak ditemukan"})
		return
	}

	if !containsStatus(def.AllowedFromStatuses, fromStatus) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak dapat melakukan aksi '" + def.Label + "' dari status '" + fromStatus + "'"})
		return
	}

	var updatedID string
	if prodLink != "" {
		err = h.Pool.QueryRow(c.Request.Context(), `
			UPDATE contents SET status = $1, production_link = $2, updated_by = $3, updated_at = now()
			WHERE id = $4 RETURNING id
		`, def.ToStatus, prodLink, user.ID, contentID).Scan(&updatedID)
	} else {
		err = h.Pool.QueryRow(c.Request.Context(), `
			UPDATE contents SET status = $1, updated_by = $2, updated_at = now()
			WHERE id = $3 RETURNING id
		`, def.ToStatus, user.ID, contentID).Scan(&updatedID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status alur kerja konten"})
		return
	}

	// Simpan ke riwayat persetujuan
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, contentID, body.Action, fromStatus, def.ToStatus, comment, user.ID)

	// Jika status menjadi READY_TO_PUBLISH, otomatis buat entri di tabel publications untuk tiap platform
	if def.ToStatus == "READY_TO_PUBLISH" {
		var plannedDate *string
		var singlePlatID *string
		var multiPlatIDs []string
		_ = h.Pool.QueryRow(c.Request.Context(), `
			SELECT planned_date::TEXT, platform_id, COALESCE(platform_ids, '{}') FROM contents WHERE id = $1
		`, contentID).Scan(&plannedDate, &singlePlatID, &multiPlatIDs)

		targetPlatforms := multiPlatIDs
		if len(targetPlatforms) == 0 && singlePlatID != nil && *singlePlatID != "" {
			targetPlatforms = []string{*singlePlatID}
		}

		for _, pid := range targetPlatforms {
			if strings.TrimSpace(pid) == "" {
				continue
			}
			var exists bool
			_ = h.Pool.QueryRow(c.Request.Context(), `
				SELECT EXISTS(SELECT 1 FROM publications WHERE content_id = $1 AND platform_id = $2)
			`, contentID, pid).Scan(&exists)
			if !exists {
				_, errInsert := h.Pool.Exec(c.Request.Context(), `
					INSERT INTO publications (content_id, platform_id, planned_publish_date, status)
					VALUES ($1, $2, $3, 'PLANNED')
				`, contentID, pid, plannedDate)
				if errInsert != nil {
					log.Printf("Auto-create publication error: %v", errInsert)
				}
			} else {
				_, _ = h.Pool.Exec(c.Request.Context(), `
					UPDATE publications SET planned_publish_date = $1, updated_at = now()
					WHERE content_id = $2 AND platform_id = $3 AND status != 'PUBLISHED'
				`, plannedDate, contentID, pid)
			}
		}
	}

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", updatedID)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat data konten"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"content": contents[0], "message": "Status konten berhasil diperbarui menjadi " + def.ToStatus})
}

// GET /api/workflow/approval-queue
func (h *Handler) ApprovalQueue(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	statuses, ok := approvalQueueStatuses[user.Role]
	if !ok || len(statuses) == 0 {
		c.JSON(http.StatusOK, gin.H{"queue": []any{}, "role": user.Role})
		return
	}

	contents, err := h.queryContents(c.Request.Context(),
		contentSelect+" WHERE c.status = ANY($1) AND COALESCE(c.is_savings, FALSE) = FALSE ORDER BY c.created_at DESC", statuses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil antrean persetujuan"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	h.attachLatestComments(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"queue": contents, "role": user.Role})
}

// GET /api/workflow/tasks
func (h *Handler) MyTasks(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	// Ambil konten milik user (atau seluruh konten jika role ADMIN) yang tidak dalam tabungan
	var query string
	var args []any

	if user.Role == "ADMIN" {
		query = contentSelect + " WHERE COALESCE(c.is_savings, FALSE) = FALSE ORDER BY c.created_at DESC"
	} else {
		query = contentSelect + " WHERE (c.created_by = $1 OR c.pic ILIKE $2 OR c.pic ILIKE $3 OR c.pic IS NULL OR c.pic = '') AND COALESCE(c.is_savings, FALSE) = FALSE ORDER BY c.created_at DESC"
		userEmailSearch := "%" + user.Email + "%"
		var fullName string
		if user.FullName != nil {
			fullName = *user.FullName
		}
		userFullNameSearch := "%" + fullName + "%"
		args = append(args, user.ID, userEmailSearch, userFullNameSearch)
	}

	contents, err := h.queryContents(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar tugas"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	h.attachLatestComments(c.Request.Context(), contents)

	revisions := []models.Content{}
	drafts := []models.Content{}
	pendingApproval := []models.Content{}
	production := []models.Content{}
	readyToPublish := []models.Content{}
	published := []models.Content{}
	rejected := []models.Content{}

	for _, ct := range contents {
		switch ct.Status {
		case "REVISION_REQUIRED":
			revisions = append(revisions, ct)
		case "DRAFT":
			drafts = append(drafts, ct)
		case "PENDING_REVIEW", "PENDING_PRODUCTION_REVIEW":
			pendingApproval = append(pendingApproval, ct)
		case "APPROVED", "PRODUCTION":
			production = append(production, ct)
		case "READY_TO_PUBLISH":
			readyToPublish = append(readyToPublish, ct)
		case "PUBLISHED":
			published = append(published, ct)
		case "REJECTED":
			rejected = append(rejected, ct)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"revisions":       revisions,
		"drafts":          drafts,
		"pendingApproval": pendingApproval,
		"production":      production,
		"readyToPublish":  readyToPublish,
		"published":       published,
		"rejected":        rejected,
	})
}

func containsRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

func containsStatus(statuses []string, status string) bool {
	for _, s := range statuses {
		if s == status {
			return true
		}
	}
	return false
}
