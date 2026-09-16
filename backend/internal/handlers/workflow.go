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
	Label               string
	AllowedRoles        []string
	AllowedFromStatuses []string
	ToStatus            string
	RequiresComment     bool
}

// Alur kerja PLN:
// - STAFF: Kerjakan, Ajukan untuk ditinjau, Kirim ulang revisi
// - ADMIN: Setujui, Minta Revisi, Tandai Publikasi, Ditolak
var workflowActions = map[string]workflowActionDef{
	"START_PROGRESS": {
		Label:               "Mulai Dikerjakan",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"DRAFT"},
		ToStatus:            "IN_PROGRESS",
		RequiresComment:     false,
	},
	"SUBMITTED": {
		Label:               "Ajukan untuk Ditinjau",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"DRAFT", "IN_PROGRESS"},
		ToStatus:            "PENDING_REVIEW",
		RequiresComment:     false,
	},
	"RESUBMITTED": {
		Label:               "Ajukan Ulang Revisi",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"REVISION_REQUIRED", "IN_PROGRESS"},
		ToStatus:            "PENDING_REVIEW",
		RequiresComment:     false,
	},
	"APPROVED": {
		Label:               "Setujui Konten",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "APPROVED",
		RequiresComment:     false,
	},
	"REVISION_REQUESTED": {
		Label:               "Minta Revisi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "IN_PROGRESS", // Kembali ke Dalam Proses sesuai Alur Revisi
		RequiresComment:     true,
	},
	"MARK_PUBLISHED": {
		Label:               "Tandai Dipublikasikan",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"APPROVED", "READY_TO_PUBLISH"},
		ToStatus:            "PUBLISHED",
		RequiresComment:     false,
	},
	"FINAL_APPROVED": {
		Label:               "Setujui Final",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"APPROVED"},
		ToStatus:            "READY_TO_PUBLISH",
		RequiresComment:     false,
	},
	"REJECTED": {
		Label:               "Tolak / Minta Revisi",
		AllowedRoles:        []string{"ADMIN"},
		AllowedFromStatuses: []string{"APPROVED", "READY_TO_PUBLISH"},
		ToStatus:            "IN_PROGRESS",
		RequiresComment:     true,
	},
}

var approvalQueueStatuses = map[string][]string{
	"ADMIN": {"PENDING_REVIEW", "APPROVED"},
	"STAFF": {},
}

type workflowBody struct {
	Action  string  `json:"action" binding:"required"`
	Comment *string `json:"comment"`
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
	err = h.Pool.QueryRow(c.Request.Context(), `
		UPDATE contents SET status = $1, updated_by = $2, updated_at = now()
		WHERE id = $3 RETURNING id
	`, def.ToStatus, user.ID, contentID).Scan(&updatedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status alur kerja konten"})
		return
	}

	// Simpan ke riwayat persetujuan
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, contentID, body.Action, fromStatus, def.ToStatus, comment, user.ID)

	// Jika status menjadi APPROVED, otomatis buat entri di tabel publications untuk tiap platform
	if def.ToStatus == "APPROVED" {
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
		contentSelect+" WHERE c.status = ANY($1) AND COALESCE(c.is_savings, FALSE) = FALSE ORDER BY c.updated_at ASC", statuses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil antrean persetujuan"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)
	c.JSON(http.StatusOK, gin.H{"queue": contents, "role": user.Role})
}

// GET /api/workflow/tasks
func (h *Handler) MyTasks(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	// Ambil konten milik user yang tidak dalam tabungan
	query := contentSelect + " WHERE (c.created_by = $1 OR c.pic ILIKE $2) AND COALESCE(c.is_savings, FALSE) = FALSE ORDER BY c.updated_at DESC"
	userSearch := "%" + user.Email + "%"
	contents, err := h.queryContents(c.Request.Context(), query, user.ID, userSearch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar tugas"})
		return
	}
	h.attachPublications(c.Request.Context(), contents)

	drafts := []models.Content{}
	revisions := []models.Content{}
	readyToPublish := []models.Content{}
	submitted := []models.Content{}
	for _, ct := range contents {
		switch ct.Status {
		case "DRAFT", "IN_PROGRESS":
			drafts = append(drafts, ct)
		case "REVISION_REQUIRED":
			revisions = append(revisions, ct)
		case "READY_TO_PUBLISH", "APPROVED":
			readyToPublish = append(readyToPublish, ct)
		case "PENDING_REVIEW":
			submitted = append(submitted, ct)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"drafts":         drafts,
		"revisions":      revisions,
		"readyToPublish": readyToPublish,
		"submitted":      submitted,
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
