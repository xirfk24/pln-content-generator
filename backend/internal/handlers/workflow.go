package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/models"
)

// Workflow action definitions, ported 1:1 from src/constants/workflow.ts
type workflowActionDef struct {
	Label               string
	AllowedRoles        []string
	AllowedFromStatuses []string
	ToStatus            string
	RequiresComment     bool
}

var workflowActions = map[string]workflowActionDef{
	"SUBMITTED": {
		Label:               "Submit for Review",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"DRAFT", "PLANNED", "IN_PROGRESS"},
		ToStatus:            "PENDING_REVIEW",
	},
	"RESUBMITTED": {
		Label:               "Resubmit for Review",
		AllowedRoles:        []string{"ADMIN", "STAFF"},
		AllowedFromStatuses: []string{"REVISION_REQUIRED"},
		ToStatus:            "PENDING_REVIEW",
	},
	"REVIEWED": {
		Label:               "Mark as Reviewed",
		AllowedRoles:        []string{"ADMIN", "REVIEWER"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "PENDING_REVIEW",
	},
	"REVISION_REQUESTED": {
		Label:               "Request Revision",
		AllowedRoles:        []string{"ADMIN", "REVIEWER"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "REVISION_REQUIRED",
		RequiresComment:     true,
	},
	"REVIEW_APPROVED": {
		Label:               "Approve Review",
		AllowedRoles:        []string{"ADMIN", "REVIEWER"},
		AllowedFromStatuses: []string{"PENDING_REVIEW"},
		ToStatus:            "APPROVED",
	},
	"FINAL_APPROVED": {
		Label:               "Final Approval",
		AllowedRoles:        []string{"ADMIN", "APPROVER"},
		AllowedFromStatuses: []string{"APPROVED"},
		ToStatus:            "READY_TO_PUBLISH",
	},
	"REJECTED": {
		Label:               "Reject",
		AllowedRoles:        []string{"ADMIN", "APPROVER"},
		AllowedFromStatuses: []string{"APPROVED", "READY_TO_PUBLISH"},
		ToStatus:            "REVISION_REQUIRED",
		RequiresComment:     true,
	},
}

var approvalQueueStatuses = map[string][]string{
	"REVIEWER": {"PENDING_REVIEW"},
	"APPROVER": {"APPROVED"},
	"ADMIN":    {"PENDING_REVIEW", "APPROVED"},
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "action is required"})
		return
	}

	def, ok := workflowActions[body.Action]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action: " + body.Action})
		return
	}

	comment := ""
	if body.Comment != nil {
		comment = strings.TrimSpace(*body.Comment)
	}
	if def.RequiresComment && comment == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment is required for this action"})
		return
	}

	if !containsRole(def.AllowedRoles, user.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role " + user.Role + " is not allowed to perform " + def.Label})
		return
	}

	var fromStatus string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT status FROM contents WHERE id = $1", contentID).Scan(&fromStatus)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
		return
	}

	if !containsStatus(def.AllowedFromStatuses, fromStatus) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot " + def.Label + " from status " + fromStatus})
		return
	}

	var updatedID string
	err = h.Pool.QueryRow(c.Request.Context(), `
		UPDATE contents SET status = $1, updated_by = $2, updated_at = now()
		WHERE id = $3 RETURNING id
	`, def.ToStatus, user.ID, contentID).Scan(&updatedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update content status"})
		return
	}

	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, contentID, body.Action, fromStatus, def.ToStatus, comment, user.ID)

	contents, err := h.queryContents(c.Request.Context(), contentSelect+" WHERE c.id = $1", updatedID)
	if err != nil || len(contents) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load content"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": contents[0]})
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
		contentSelect+" WHERE c.status = ANY($1) ORDER BY c.updated_at ASC", statuses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch queue"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"queue": contents, "role": user.Role})
}

// GET /api/workflow/tasks
func (h *Handler) MyTasks(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	contents, err := h.queryContents(c.Request.Context(),
		contentSelect+" WHERE c.created_by = $1 ORDER BY c.updated_at DESC", user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}

	drafts := []models.Content{}
	revisions := []models.Content{}
	readyToPublish := []models.Content{}
	submitted := []models.Content{}
	for _, ct := range contents {
		switch ct.Status {
		case "DRAFT", "PLANNED", "IN_PROGRESS":
			drafts = append(drafts, ct)
		case "REVISION_REQUIRED":
			revisions = append(revisions, ct)
		case "READY_TO_PUBLISH":
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
