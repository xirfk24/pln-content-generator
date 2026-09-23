package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type PublicationMetrics struct {
	URL      string `json:"url"`
	Reach    int    `json:"reach"`
	Views    int    `json:"views"`
	Likes    int    `json:"likes"`
	Comments int    `json:"comments"`
	Saves    int    `json:"saves"`
	Shares   int    `json:"shares"`
}

type reportRow struct {
	ID                  *string                       `json:"id"`
	Title               string                        `json:"title"`
	Topic               string                        `json:"topic"`
	Status              string                        `json:"status"`
	PlannedDate         *string                       `json:"planned_date"`
	Format              *string                       `json:"format"`
	ContentPurpose      *string                       `json:"content_purpose"`
	PostingCategory     *string                       `json:"posting_category"`
	Pillar              *string                       `json:"pillar"`
	Platform            *string                       `json:"platform"`
	Category            *string                       `json:"category"`
	PostURL             *string                       `json:"post_url"`
	Reach               int                           `json:"reach"`
	Views               int                           `json:"views"`
	Likes               int                           `json:"likes"`
	Comments            int                           `json:"comments"`
	Saves               int                           `json:"saves"`
	Shares              int                           `json:"shares"`
	PlatformPubs        map[string]PublicationMetrics `json:"platform_publications"`
}

// GET /api/reports — JSON rows or CSV export (format=csv)
func (h *Handler) Reports(c *gin.Context) {
	// Auto-sync: Pastikan setiap platform dari konten yang belum memiliki record publikasi dibuatkan record publikasi awal
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO publications (content_id, platform_id, planned_publish_date, status, notes)
		SELECT 
			c.id, 
			c.platform_id, 
			c.planned_date, 
			CASE WHEN c.status = 'PUBLISHED' THEN 'PUBLISHED' ELSE 'PLANNED' END,
			'Auto-sync antrean publikasi'
		FROM contents c
		LEFT JOIN publications p ON p.content_id = c.id
		WHERE p.id IS NULL AND COALESCE(c.is_savings, FALSE) = FALSE AND c.platform_id IS NOT NULL;
	`)
	_, _ = h.Pool.Exec(c.Request.Context(), `
		INSERT INTO publications (content_id, platform_id, planned_publish_date, status, notes)
		SELECT 
			c.id, 
			pid, 
			c.planned_date, 
			CASE WHEN c.status = 'PUBLISHED' THEN 'PUBLISHED' ELSE 'PLANNED' END,
			'Auto-sync antrean publikasi'
		FROM contents c,
		     UNNEST(c.platform_ids) pid
		LEFT JOIN publications p ON p.content_id = c.id AND p.platform_id = pid
		WHERE p.id IS NULL AND COALESCE(c.is_savings, FALSE) = FALSE AND pid IS NOT NULL AND pid != '';
	`)

	f := readFilters(c)

	where := []string{"COALESCE(c.is_savings, FALSE) = FALSE"}
	args := []any{}
	if f.dateFrom != "" {
		args = append(args, f.dateFrom)
		where = append(where, "COALESCE(p.planned_publish_date, c.planned_date) >= $"+itoa(len(args)))
	}
	if f.dateTo != "" {
		args = append(args, f.dateTo)
		where = append(where, "COALESCE(p.planned_publish_date, c.planned_date) <= $"+itoa(len(args)))
	}
	if f.platformID != "" {
		args = append(args, f.platformID)
		where = append(where, "(c.platform_id = $"+itoa(len(args))+" OR $"+itoa(len(args))+" = ANY(c.platform_ids) OR p.platform_id = $"+itoa(len(args))+")")
	}
	if f.pillarID != "" {
		args = append(args, f.pillarID)
		where = append(where, "c.pillar_id = $"+itoa(len(args)))
	}

	// Filter status: Default to PUBLISHED data if status filter is empty or set to PUBLISHED
	if f.status != "" {
		if f.status == "PUBLISHED" {
			where = append(where, "(c.status = 'PUBLISHED' OR EXISTS (SELECT 1 FROM publications p_sub WHERE p_sub.content_id = c.id AND p_sub.status = 'PUBLISHED'))")
		} else {
			args = append(args, f.status)
			where = append(where, "c.status = $"+itoa(len(args)))
		}
	} else {
		// Default filter: Ambil data dipublikasikan saja
		where = append(where, "(c.status = 'PUBLISHED' OR EXISTS (SELECT 1 FROM publications p_sub WHERE p_sub.content_id = c.id AND p_sub.status = 'PUBLISHED'))")
	}

	rows, err := h.Pool.Query(h.ctx(), `
		SELECT c.id, c.title, c.topic,
		       'PUBLISHED' AS status,
		       COALESCE(MAX(p.planned_publish_date::TEXT), c.planned_date::TEXT) AS planned_date,
		       c.format, c.content_purpose, c.posting_category,
		       pi.name AS pillar_name,
		       pl_c.name AS platform_name,
		       ca.name AS category_name,
		       COALESCE(MAX(p.url), '') AS post_url,
		       COALESCE(SUM(pm.reach), 0)::INT AS reach,
		       COALESCE(SUM(pm.views), 0)::INT AS views,
		       COALESCE(SUM(pm.likes), 0)::INT AS likes,
		       COALESCE(SUM(pm.comments), 0)::INT AS comments,
		       COALESCE(SUM(pm.saves), 0)::INT AS saves,
		       COALESCE(SUM(pm.shares), 0)::INT AS shares
		FROM contents c
		LEFT JOIN pillars pi ON pi.id = c.pillar_id
		LEFT JOIN categories ca ON ca.id = c.category_id
		LEFT JOIN platforms pl_c ON pl_c.id = c.platform_id
		LEFT JOIN publications p ON p.content_id = c.id
		LEFT JOIN performance_metrics pm ON pm.publication_id = p.id
		WHERE `+strings.Join(where, " AND ")+`
		GROUP BY c.id, c.title, c.topic, c.planned_date, c.format,
		         c.content_purpose, c.posting_category, pi.name, pl_c.name, ca.name
		ORDER BY COALESCE(MAX(p.planned_publish_date), c.planned_date) DESC`, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch report"})
		return
	}
	defer rows.Close()

	out := []reportRow{}
	contentIDs := []string{}
	for rows.Next() {
		var r reportRow
		r.PlatformPubs = make(map[string]PublicationMetrics)
		if err := rows.Scan(&r.ID, &r.Title, &r.Topic, &r.Status, &r.PlannedDate,
			&r.Format, &r.ContentPurpose, &r.PostingCategory, &r.Pillar, &r.Platform, &r.Category,
			&r.PostURL, &r.Reach, &r.Views, &r.Likes, &r.Comments, &r.Saves, &r.Shares); err != nil {
			continue
		}
		out = append(out, r)
		if r.ID != nil {
			contentIDs = append(contentIDs, *r.ID)
		}
	}

	// Fetch per-platform publication details for each content ID
	if len(contentIDs) > 0 {
		pubRows, err := h.Pool.Query(h.ctx(), `
			SELECT p.content_id, COALESCE(pl.name, 'Lainnya') AS platform_name,
			       COALESCE(p.url, '') AS url,
			       COALESCE(SUM(pm.reach), 0)::INT AS reach,
			       COALESCE(SUM(pm.views), 0)::INT AS views,
			       COALESCE(SUM(pm.likes), 0)::INT AS likes,
			       COALESCE(SUM(pm.comments), 0)::INT AS comments,
			       COALESCE(SUM(pm.saves), 0)::INT AS saves,
			       COALESCE(SUM(pm.shares), 0)::INT AS shares
			FROM publications p
			LEFT JOIN platforms pl ON pl.id = p.platform_id
			LEFT JOIN performance_metrics pm ON pm.publication_id = p.id
			WHERE p.content_id = ANY($1)
			GROUP BY p.content_id, pl.name, p.url
		`, contentIDs)
		if err == nil {
			defer pubRows.Close()
			pubMap := make(map[string]map[string]PublicationMetrics)
			for pubRows.Next() {
				var cID, pName, url string
				var reach, views, likes, comments, saves, shares int
				if err := pubRows.Scan(&cID, &pName, &url, &reach, &views, &likes, &comments, &saves, &shares); err == nil {
					if _, exists := pubMap[cID]; !exists {
						pubMap[cID] = make(map[string]PublicationMetrics)
					}
					pubMap[cID][pName] = PublicationMetrics{
						URL:      url,
						Reach:    reach,
						Views:    views,
						Likes:    likes,
						Comments: comments,
						Saves:    saves,
						Shares:   shares,
					}
				}
			}
			for i := range out {
				if out[i].ID != nil {
					if pm, ok := pubMap[*out[i].ID]; ok {
						out[i].PlatformPubs = pm
					}
				}
			}
		}
	}

	if c.Query("format") == "csv" {
		headers := []string{"Tanggal Rencana/Terbit", "Judul Konten", "Topik Konten", "Content Pillar", "Platform", "Format", "Tujuan Konten", "Kategori Posting", "Status", "Link Post", "Reach", "Views", "Likes", "Comments", "Saves", "Shares"}
		var sb strings.Builder
		sb.WriteString("\uFEFF") // BOM for Excel
		sb.WriteString(strings.Join(headers, ","))
		sb.WriteString("\n")
		for _, r := range out {
			cells := []string{
				derefString(r.PlannedDate),
				r.Title,
				r.Topic,
				derefString(r.Pillar),
				derefString(r.Platform),
				derefString(r.Format),
				derefString(r.ContentPurpose),
				derefString(r.PostingCategory),
				r.Status,
				derefString(r.PostURL),
				itoa(r.Reach),
				itoa(r.Views),
				itoa(r.Likes),
				itoa(r.Comments),
				itoa(r.Saves),
				itoa(r.Shares),
			}
			for j, cell := range cells {
				if j > 0 {
					sb.WriteString(",")
				}
				sb.WriteString(csvEscape(cell))
			}
			sb.WriteString("\n")
		}
		filename := "laporan-konten-pln-" + time.Now().Format("2006-01-02") + ".csv"
		c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
		c.Data(http.StatusOK, "text/csv; charset=utf-8", []byte(sb.String()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"rows": out, "total": len(out)})
}

func csvEscape(s string) string {
	if len(s) > 0 {
		switch s[0] {
		case '=', '+', '-', '@', '\t', '\r':
			s = "'" + s
		}
	}
	if strings.ContainsAny(s, ",\"\n\r") {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}
	return s
}
