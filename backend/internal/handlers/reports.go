package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GET /api/reports — JSON rows or CSV export (format=csv)
func (h *Handler) Reports(c *gin.Context) {
	f := readFilters(c)

	where := []string{"TRUE"}
	args := []any{}
	if f.dateFrom != "" {
		args = append(args, f.dateFrom)
		where = append(where, "c.planned_date >= $"+itoa(len(args)))
	}
	if f.dateTo != "" {
		args = append(args, f.dateTo)
		where = append(where, "c.planned_date <= $"+itoa(len(args)))
	}
	if f.platformID != "" {
		args = append(args, f.platformID)
		where = append(where, "c.platform_id = $"+itoa(len(args)))
	}
	if f.pillarID != "" {
		args = append(args, f.pillarID)
		where = append(where, "c.pillar_id = $"+itoa(len(args)))
	}
	if f.status != "" {
		args = append(args, f.status)
		where = append(where, "c.status = $"+itoa(len(args)))
	}

	rows, err := h.Pool.Query(h.ctx(), `
		SELECT c.id, c.title, c.topic, c.status, c.planned_date::TEXT, c.pic, c.priority, c.format,
		       c.content_purpose, c.posting_category,
		       pi.name, pl.name, ca.name
		FROM contents c
		LEFT JOIN pillars pi ON pi.id = c.pillar_id
		LEFT JOIN platforms pl ON pl.id = c.platform_id
		LEFT JOIN categories ca ON ca.id = c.category_id
		WHERE `+strings.Join(where, " AND ")+`
		ORDER BY c.planned_date DESC`, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch report"})
		return
	}
	defer rows.Close()

	type reportRow struct {
		ID              *string `json:"id"`
		Title           string  `json:"title"`
		Topic           string  `json:"topic"`
		Status          string  `json:"status"`
		PlannedDate     *string `json:"planned_date"`
		Pic             *string `json:"pic"`
		Priority        *string `json:"priority"`
		Format          *string `json:"format"`
		ContentPurpose  *string `json:"content_purpose"`
		PostingCategory *string `json:"posting_category"`
		Pillar          *string `json:"pillar"`
		Platform        *string `json:"platform"`
		Category        *string `json:"category"`
	}

	out := []reportRow{}
	for rows.Next() {
		var r reportRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Topic, &r.Status, &r.PlannedDate, &r.Pic,
			&r.Priority, &r.Format, &r.ContentPurpose, &r.PostingCategory, &r.Pillar, &r.Platform, &r.Category); err != nil {
			continue
		}
		out = append(out, r)
	}

	if c.Query("format") == "csv" {
		headers := []string{"ID", "Judul", "Topik Konten", "Content Pillar", "Platform", "Kategori", "Format", "Tujuan Konten", "Kategori Posting", "Status", "Tanggal Rencana", "PIC", "Prioritas"}
		var sb strings.Builder
		sb.WriteString("\uFEFF") // BOM for Excel
		sb.WriteString(strings.Join(headers, ","))
		sb.WriteString("\n")
		for _, r := range out {
			cells := []string{
				derefString(r.ID),
				r.Title,
				r.Topic,
				derefString(r.Pillar),
				derefString(r.Platform),
				derefString(r.Category),
				derefString(r.Format),
				derefString(r.ContentPurpose),
				derefString(r.PostingCategory),
				r.Status,
				derefString(r.PlannedDate),
				derefString(r.Pic),
				derefString(r.Priority),
			}
			for j, cell := range cells {
				if j > 0 {
					sb.WriteString(",")
				}
				sb.WriteString(csvEscape(cell))
			}
			sb.WriteString("\n")
		}
		filename := "content-report-" + time.Now().Format("2006-01-02") + ".csv"
		c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
		c.Data(http.StatusOK, "text/csv; charset=utf-8", []byte(sb.String()))
		return
	}

	c.JSON(http.StatusOK, gin.H{"rows": out, "total": len(out)})
}

func csvEscape(s string) string {
	if strings.ContainsAny(s, ",\"\n\r") {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}
	return s
}
