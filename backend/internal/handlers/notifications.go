package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Notification dibangun dari approval_histories (event log), bukan dari status
// saat ini, supaya event revisi/ditolak/disetujui tetap terlihat meski status
// konten sudah berlanjut (mis. revisi konsep mengembalikan status ke DRAFT).

// notifDef adalah template notifikasi untuk satu aksi workflow.
type notifDef struct {
	Type        string
	Priority    string
	Title       string
	Description string
	NeedsAction bool
}

// Aksi yang relevan sebagai notifikasi, beserta tipe & prioritasnya.
var notificationDefs = map[string]notifDef{
	"SUBMITTED":                     {Type: "APPROVAL", Priority: "HIGH", Title: "Konten menunggu persetujuan", Description: "Konsep baru menunggu review admin", NeedsAction: true},
	"PRODUCTION_SUBMITTED":          {Type: "APPROVAL", Priority: "HIGH", Title: "Hasil produksi siap ditinjau", Description: "Tinjau hasil produksi sebelum siap publikasi", NeedsAction: true},
	"CONCEPT_REVISION_REQUESTED":    {Type: "REVISION", Priority: "HIGH", Title: "Konten perlu direvisi", Description: "Lihat catatan revisi konsep dari admin", NeedsAction: true},
	"PRODUCTION_REVISION_REQUESTED": {Type: "REVISION", Priority: "HIGH", Title: "Hasil produksi perlu direvisi", Description: "Lihat catatan revisi produksi dari admin", NeedsAction: true},
	"REVISION_FROM_READY":           {Type: "REVISION", Priority: "HIGH", Title: "Konten perlu direvisi", Description: "Konten dikembalikan untuk revisi sebelum tayang", NeedsAction: true},
	"REJECTED":                      {Type: "REJECTED", Priority: "HIGH", Title: "Konten ditolak", Description: "Lihat alasan penolakan dari admin", NeedsAction: true},
	"APPROVED":                      {Type: "APPROVAL", Priority: "MEDIUM", Title: "Konten disetujui", Description: "Konsep disetujui, siap untuk produksi konten", NeedsAction: false},
	"PRODUCTION_APPROVED":           {Type: "APPROVAL", Priority: "MEDIUM", Title: "Produksi disetujui", Description: "Konten telah disetujui dan siap ditayangkan", NeedsAction: false},
	"SHORTCUT_READY":                {Type: "APPROVAL", Priority: "MEDIUM", Title: "Konten siap publikasi", Description: "Konten telah disetujui dan siap ditayangkan", NeedsAction: false},
}

// Peran menentukan event mana yang relevan:
// - STAFF: event pada konten miliknya (revisi/ditolak/disetujui untuknya).
// - ADMIN: event yang menunggu tindakannya (persetujuan), plus
//   revisi/ditolak/disetujui di semua konten sebagai informasi.
var staffNotifActions = map[string]bool{
	"CONCEPT_REVISION_REQUESTED":    true,
	"PRODUCTION_REVISION_REQUESTED": true,
	"REVISION_FROM_READY":           true,
	"REJECTED":                      true,
	"APPROVED":                      true,
	"PRODUCTION_APPROVED":           true,
	"SHORTCUT_READY":                true,
}

var adminNotifActions = map[string]bool{
	"SUBMITTED":                     true,
	"PRODUCTION_SUBMITTED":          true,
	"CONCEPT_REVISION_REQUESTED":    true,
	"PRODUCTION_REVISION_REQUESTED": true,
	"REVISION_FROM_READY":           true,
	"REJECTED":                      true,
	"APPROVED":                      true,
	"PRODUCTION_APPROVED":           true,
	"SHORTCUT_READY":                true,
}

// GET /api/notifications
func (h *Handler) ListNotifications(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var actionFilter map[string]bool
	var query string
	if user.Role == "ADMIN" {
		actionFilter = adminNotifActions
		query = `
			SELECT ah.id, ah.action, ah.comment, ah.performed_at, ah.performed_by,
			       c.id, c.title
			FROM approval_histories ah
			JOIN contents c ON c.id = ah.content_id
			WHERE COALESCE(c.is_savings, FALSE) = FALSE
			  AND ah.performed_by != $1
			ORDER BY ah.performed_at DESC
			LIMIT 100`
	} else {
		actionFilter = staffNotifActions
		query = `
			SELECT ah.id, ah.action, ah.comment, ah.performed_at, ah.performed_by,
			       c.id, c.title
			FROM approval_histories ah
			JOIN contents c ON c.id = ah.content_id
			WHERE (c.created_by = $1 OR c.pic ILIKE $2)
			  AND COALESCE(c.is_savings, FALSE) = FALSE
			  AND ah.performed_by != $1
			ORDER BY ah.performed_at DESC
			LIMIT 100`
	}

	rows, err := h.Pool.Query(c.Request.Context(), query, user.ID, "%"+user.Email+"%")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil notifikasi"})
		return
	}
	defer rows.Close()

	type notification struct {
		ID           string  `json:"id"`
		ContentID    string  `json:"content_id"`
		Type         string  `json:"type"`
		Priority     string  `json:"priority"`
		Title        string  `json:"title"`
		ContentTitle string  `json:"content_title"`
		Description  string  `json:"description"`
		Comment      *string `json:"comment"`
		Timestamp    string  `json:"timestamp"`
		ActionURL    string  `json:"action_url"`
		NeedsAction  bool    `json:"needs_action"`
	}

	items := []notification{}
	for rows.Next() {
		var (
			id, action, contentID, contentTitle, performedBy string
			comment                                         *string
			performedAt                                     timeDb
		)
		if err := rows.Scan(&id, &action, &comment, &performedAt, &performedBy,
			&contentID, &contentTitle); err != nil {
			continue
		}
		def, ok := notificationDefs[action]
		if !ok || !actionFilter[action] {
			continue
		}
		items = append(items, notification{
			ID:           id,
			ContentID:    contentID,
			Type:         def.Type,
			Priority:     def.Priority,
			Title:        def.Title,
			ContentTitle: contentTitle,
			Description:  def.Description,
			Comment:      comment,
			Timestamp:    performedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
			ActionURL:    "/content/" + contentID,
			NeedsAction:  def.NeedsAction,
		})
	}

	c.JSON(http.StatusOK, gin.H{"notifications": items})
}

// cleanNotifIDs membuang ID kosong dan duplikat dari input read-state.
func cleanNotifIDs(ids []string) []string {
	seen := make(map[string]bool, len(ids))
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

// GET /api/notifications/read — semua ID notifikasi yang sudah dibaca user ini.
func (h *Handler) ListNotificationReads(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	rows, err := h.Pool.Query(c.Request.Context(),
		`SELECT notification_id FROM notification_reads WHERE user_id = $1`, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil status notifikasi"})
		return
	}
	defer rows.Close()

	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}
	c.JSON(http.StatusOK, gin.H{"ids": ids})
}

type markReadBody struct {
	IDs []string `json:"ids"`
}

// POST /api/notifications/read — tandai notifikasi sudah dibaca (idempotent).
func (h *Handler) MarkNotificationsRead(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var body markReadBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}
	ids := cleanNotifIDs(body.IDs)
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada ID notifikasi yang dikirim"})
		return
	}
	if len(ids) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maksimal 500 notifikasi sekali tandai"})
		return
	}

	if _, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO notification_reads (user_id, notification_id)
		SELECT $1, x FROM unnest($2::text[]) AS x
		ON CONFLICT (user_id, notification_id) DO NOTHING
	`, user.ID, ids); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan status notifikasi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
