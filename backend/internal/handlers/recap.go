package handlers

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Monthly & Semester Content Recap ---
//
// UR-01: User can select year + period mode (Monthly/Semester) to see
//        automatic recap of planned vs published content.
//
// Aturan tanggal publikasi (priority order):
//   1. publications.actual_publish_date  → status "Verified"
//   2. publications.planned_publish_date  → status "Unverified"
//   3. contents.planned_date             → status "Unverified"
//
// Realization Rate = Published Total / Planned Total × 100%
// Denominator 0 → 0% (no NaN/Infinity)

// --- Package-level types for CSV serialization ---

type recapDetailRow struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	Topic           string  `json:"topic"`
	Pillar          *string `json:"pillar"`
	PillarCode      *string `json:"pillar_code"`
	Platform        *string `json:"platform"`
	Status          string  `json:"status"`
	PlannedDate     *string `json:"planned_date"`
	PublishedDate   *string `json:"published_date"`
	PublishVerified bool    `json:"publish_verified"`
}

type pillarBreakdownRow struct {
	Pillar      string  `json:"pillar"`
	PillarCode  string  `json:"pillar_code"`
	Planned     int     `json:"planned"`
	Published   int     `json:"published"`
	Unverified  int     `json:"unverified"`
	Realization float64 `json:"realization_rate"`
}

type platformBreakdownRow struct {
	Platform    string  `json:"platform"`
	Planned     int     `json:"planned"`
	Published   int     `json:"published"`
	Verified    int     `json:"verified"`
	Unverified  int     `json:"unverified"`
	Realization float64 `json:"realization_rate"`
}

// --- Internal types ---

type recapPublicationRow struct {
	ID           string
	ContentID    string
	ResolvedDate string // ISO YYYY-MM-DD
	Verified     bool   // true if actual_publish_date was used
	PlatformID   *string
	PlatformName *string
}

type recapContentRow struct {
	ID           string
	Title        string
	Topic        string
	Status       string
	PlannedDate  *string
	PillarName   *string
	PlatformName *string
	PillarCode   *string
}

type pubRaw struct {
	ID                 string
	ContentID          string
	PlatformID         *string
	ActualPublishDate  *string
	PlannedPublishDate *string
}

// GET /api/recap/years — Returns years that have content, ordered desc
func (h *Handler) RecapYears(c *gin.Context) {
	rows, err := h.Pool.Query(h.ctx(), `
		SELECT EXTRACT(YEAR FROM planned_date)::INT AS yr, COUNT(*) AS cnt
		FROM contents
		WHERE planned_date IS NOT NULL
		GROUP BY yr
		ORDER BY yr DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch years"})
		return
	}
	defer rows.Close()

	type yearRow struct {
		Year  int `json:"year"`
		Count int `json:"count"`
	}
	out := []yearRow{}
	for rows.Next() {
		var r yearRow
		if err := rows.Scan(&r.Year, &r.Count); err != nil {
			continue
		}
		out = append(out, r)
	}
	c.JSON(http.StatusOK, gin.H{"years": out})
}

// GET /api/recap — Monthly & Semester Content Recap
//
// Query params:
//
//	year        — required (e.g. 2025)
//	mode        — "monthly" (default) or "semester"
//	period      — 1-12 for monthly, 1-2 for semester
//	platform_id — optional filter
//	pillar_id   — optional filter
//	format      — "json" (default) or "csv"
func (h *Handler) Recap(c *gin.Context) {
	// --- Parse & validate params ---
	yearStr := c.DefaultQuery("year", "")
	mode := c.DefaultQuery("mode", "monthly")
	periodStr := c.DefaultQuery("period", "1")
	platformID := c.Query("platform_id")
	pillarID := c.Query("pillar_id")

	if yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "year is required"})
		return
	}

	year, err := atoiSafe(yearStr)
	if err != nil || year < 2000 || year > 2100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid year"})
		return
	}

	if mode != "monthly" && mode != "semester" {
		mode = "monthly"
	}

	period, err := atoiSafe(periodStr)
	if err != nil {
		period = 1
	}
	if mode == "semester" && (period < 1 || period > 2) {
		period = 1
	}
	if mode == "monthly" && (period < 1 || period > 12) {
		period = 1
	}

	// --- Compute date range ---
	dateFrom, dateTo := getPeriodDateRange(year, mode, period)
	label := periodLabel(year, mode, period)

	// --- Load contents within date range ---
	contentWhere := []string{"TRUE"}
	args := []any{}
	args = append(args, dateFrom)
	contentWhere = append(contentWhere, "c.planned_date >= $1")
	args = append(args, dateTo)
	contentWhere = append(contentWhere, "c.planned_date <= $2")
	if pillarID != "" {
		args = append(args, pillarID)
		contentWhere = append(contentWhere, "c.pillar_id = $"+itoa(len(args)))
	}
	if platformID != "" {
		args = append(args, platformID)
		contentWhere = append(contentWhere, "c.platform_id = $"+itoa(len(args)))
	}

	// content_pillar_code is derived from the pillar name in Go (first char)
	// to avoid a hard dependency on the spreadsheet-alignment migration column.
	contentQuery := `SELECT c.id, c.title, c.topic, c.status, c.planned_date::TEXT,
		pi.name, pl.name
		FROM contents c
		LEFT JOIN pillars pi ON pi.id = c.pillar_id
		LEFT JOIN platforms pl ON pl.id = c.platform_id
		WHERE ` + strings.Join(contentWhere, " AND ") + `
		ORDER BY c.planned_date ASC`

	rows, err := h.Pool.Query(h.ctx(), contentQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contents"})
		return
	}
	defer rows.Close()

	contents := []recapContentRow{}
	for rows.Next() {
		var r recapContentRow
		if err := rows.Scan(&r.ID, &r.Title, &r.Topic, &r.Status, &r.PlannedDate,
			&r.PillarName, &r.PlatformName); err != nil {
			log.Printf("recap: content row scan error: %v", err)
			continue
		}
		// Derive pillar code from pillar name first character (e.g. "A - Bencana" → "A")
		if r.PillarName != nil && len(*r.PillarName) >= 1 {
			code := string([]rune(*r.PillarName)[0])
			r.PillarCode = &code
		}
		contents = append(contents, r)
	}

	// --- Load publications for these contents ---
	contentIDs := make([]string, len(contents))
	for i, ct := range contents {
		contentIDs[i] = ct.ID
	}

	pubRaws := []pubRaw{}
	if len(contentIDs) > 0 {
		pubQuery := `SELECT id, content_id, platform_id, actual_publish_date::TEXT, planned_publish_date::TEXT
			FROM publications WHERE content_id = ANY($1)`
		pubArgs := []any{contentIDs}
		if platformID != "" {
			pubArgs = append(pubArgs, platformID)
			pubQuery += ` AND platform_id = $2`
		}

		pubRows, err := h.Pool.Query(h.ctx(), pubQuery, pubArgs...)
		if err != nil {
			log.Printf("recap: publications query error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch publications"})
			return
		}
		defer pubRows.Close()

		for pubRows.Next() {
			var p pubRaw
			if err := pubRows.Scan(&p.ID, &p.ContentID, &p.PlatformID, &p.ActualPublishDate, &p.PlannedPublishDate); err != nil {
				log.Printf("recap: publication row scan error: %v", err)
				continue
			}
			pubRaws = append(pubRaws, p)
		}
	}

	// Build content lookup for fallback date
	contentPlannedDate := map[string]string{}
	for _, ct := range contents {
		if ct.PlannedDate != nil && *ct.PlannedDate != "" {
			contentPlannedDate[ct.ID] = *ct.PlannedDate
		}
	}

	// Resolve each publication's date
	pubResolved := []recapPublicationRow{}
	for _, p := range pubRaws {
		resolved := ""
		verified := false

		if p.ActualPublishDate != nil && *p.ActualPublishDate != "" {
			resolved = *p.ActualPublishDate
			verified = true
		} else if p.PlannedPublishDate != nil && *p.PlannedPublishDate != "" {
			resolved = *p.PlannedPublishDate
			verified = false
		} else if fb, ok := contentPlannedDate[p.ContentID]; ok {
			resolved = fb
			verified = false
		}

		if resolved == "" {
			continue
		}

		// Only include publications within the period range
		if resolved < dateFrom || resolved > dateTo {
			continue
		}

		pubResolved = append(pubResolved, recapPublicationRow{
			ID:           p.ID,
			ContentID:    p.ContentID,
			ResolvedDate: resolved,
			Verified:     verified,
			PlatformID:   p.PlatformID,
		})
	}

	// --- Compute recap metrics ---
	plannedTotal := len(contents)

	publishedContentIDs := map[string]bool{}
	publishedVerified := 0
	publishedUnverified := 0
	for _, p := range pubResolved {
		if !publishedContentIDs[p.ContentID] {
			publishedContentIDs[p.ContentID] = true
			if p.Verified {
				publishedVerified++
			} else {
				publishedUnverified++
			}
		}
	}
	publishedTotal := len(publishedContentIDs)

	realizationRate := 0.0
	if plannedTotal > 0 {
		realizationRate = float64(publishedTotal) / float64(plannedTotal) * 100
	}

	// --- Build per-content detail rows ---
	detailRows := make([]recapDetailRow, 0, len(contents))
	for _, ct := range contents {
		row := recapDetailRow{
			ID:          ct.ID,
			Title:       ct.Title,
			Topic:       ct.Topic,
			Pillar:      ct.PillarName,
			PillarCode:  ct.PillarCode,
			Platform:    ct.PlatformName,
			Status:      ct.Status,
			PlannedDate: ct.PlannedDate,
		}

		// Find best publication for this content (prefer verified)
		for _, p := range pubResolved {
			if p.ContentID == ct.ID {
				if row.PublishedDate == nil || (p.Verified && !row.PublishVerified) {
					row.PublishedDate = &p.ResolvedDate
					row.PublishVerified = p.Verified
				}
			}
		}

		detailRows = append(detailRows, row)
	}

	// Sort detail rows by planned_date ascending
	sort.Slice(detailRows, func(i, j int) bool {
		a, b := "", ""
		if detailRows[i].PlannedDate != nil {
			a = *detailRows[i].PlannedDate
		}
		if detailRows[j].PlannedDate != nil {
			b = *detailRows[j].PlannedDate
		}
		return a < b
	})

	// --- Per-pillar breakdown ---
	pillarMap := map[string]*pillarBreakdownRow{}
	pillarOrder := []string{}
	for _, ct := range contents {
		name := "Unknown"
		if ct.PillarName != nil && *ct.PillarName != "" {
			name = *ct.PillarName
		}
		code := "?"
		if ct.PillarCode != nil && *ct.PillarCode != "" {
			code = *ct.PillarCode
		}
		if _, ok := pillarMap[name]; !ok {
			pillarMap[name] = &pillarBreakdownRow{Pillar: name, PillarCode: code}
			pillarOrder = append(pillarOrder, name)
		}
		pillarMap[name].Planned++
		if publishedContentIDs[ct.ID] {
			pillarMap[name].Published++
		}
	}
	for _, p := range pubResolved {
		for _, ct := range contents {
			if ct.ID == p.ContentID {
				name := "Unknown"
				if ct.PillarName != nil && *ct.PillarName != "" {
					name = *ct.PillarName
				}
				if !p.Verified {
					pillarMap[name].Unverified++
				}
				break
			}
		}
	}

	pillarBreakdown := make([]pillarBreakdownRow, 0, len(pillarOrder))
	for _, name := range pillarOrder {
		if name == "Unknown" {
			continue
		}
		row := *pillarMap[name]
		if row.Planned > 0 {
			row.Realization = float64(row.Published) / float64(row.Planned) * 100
		}
		pillarBreakdown = append(pillarBreakdown, row)
	}
	sort.Slice(pillarBreakdown, func(i, j int) bool {
		return pillarBreakdown[i].PillarCode < pillarBreakdown[j].PillarCode
	})

	// --- Per-platform breakdown ---
	platformMap := map[string]*platformBreakdownRow{}
	platformOrder := []string{}
	for _, ct := range contents {
		name := "Unknown"
		if ct.PlatformName != nil && *ct.PlatformName != "" {
			name = *ct.PlatformName
		}
		if _, ok := platformMap[name]; !ok {
			platformMap[name] = &platformBreakdownRow{Platform: name}
			platformOrder = append(platformOrder, name)
		}
		platformMap[name].Planned++
	}
	for _, p := range pubResolved {
		for _, ct := range contents {
			if ct.ID == p.ContentID {
				name := "Unknown"
				if ct.PlatformName != nil && *ct.PlatformName != "" {
					name = *ct.PlatformName
				}
				if row, ok := platformMap[name]; ok {
					if p.Verified {
						row.Verified++
					} else {
						row.Unverified++
					}
				}
				break
			}
		}
	}
	for _, ct := range contents {
		if publishedContentIDs[ct.ID] {
			name := "Unknown"
			if ct.PlatformName != nil && *ct.PlatformName != "" {
				name = *ct.PlatformName
			}
			if row, ok := platformMap[name]; ok {
				row.Published++
			}
		}
	}
	platformBreakdown := make([]platformBreakdownRow, 0, len(platformOrder))
	for _, name := range platformOrder {
		if name == "Unknown" {
			continue
		}
		row := *platformMap[name]
		if row.Planned > 0 {
			row.Realization = float64(row.Published) / float64(row.Planned) * 100
		}
		platformBreakdown = append(platformBreakdown, row)
	}
	sort.Slice(platformBreakdown, func(i, j int) bool {
		return platformBreakdown[i].Platform < platformBreakdown[j].Platform
	})

	// --- Build response ---
	response := gin.H{
		"period": gin.H{
			"year":      year,
			"mode":      mode,
			"period":    period,
			"label":     label,
			"date_from": dateFrom,
			"date_to":   dateTo,
		},
		"summary": gin.H{
			"planned":              plannedTotal,
			"published_total":      publishedTotal,
			"published_verified":   publishedVerified,
			"published_unverified": publishedUnverified,
			"realization_rate":     realizationRate,
		},
		"pillar_breakdown":   pillarBreakdown,
		"platform_breakdown": platformBreakdown,
		"detail":             detailRows,
		"total":              len(detailRows),
	}

	// --- CSV export ---
	if c.Query("format") == "csv" {
		h.writeRecapCSV(c, response, label)
		return
	}

	c.JSON(http.StatusOK, response)
}

// writeRecapCSV sends a CSV export of the recap data.
func (h *Handler) writeRecapCSV(c *gin.Context, data gin.H, label string) {
	var sb strings.Builder
	sb.WriteString("\uFEFF") // BOM for Excel

	// --- Summary section ---
	sb.WriteString("REKAP KONTEN — ")
	sb.WriteString(label)
	sb.WriteString("\n\n")

	summary := data["summary"].(gin.H)
	sb.WriteString("Metric,Value\n")
	sb.WriteString("Planned,")
	sb.WriteString(itoa(summary["planned"].(int)))
	sb.WriteString("\n")
	sb.WriteString("Published Total,")
	sb.WriteString(itoa(summary["published_total"].(int)))
	sb.WriteString("\n")
	sb.WriteString("Published Verified,")
	sb.WriteString(itoa(summary["published_verified"].(int)))
	sb.WriteString("\n")
	sb.WriteString("Published Unverified,")
	sb.WriteString(itoa(summary["published_unverified"].(int)))
	sb.WriteString("\n")
	sb.WriteString("Realization Rate,")
	sb.WriteString(fmtPercent(summary["realization_rate"].(float64)))
	sb.WriteString("%\n")

	// --- Pillar breakdown ---
	sb.WriteString("\nPILLAR BREAKDOWN\n")
	sb.WriteString("Code,Pillar,Planned,Published,Unverified,Realization Rate\n")
	for _, r := range data["pillar_breakdown"].([]pillarBreakdownRow) {
		cells := []string{
			r.PillarCode,
			r.Pillar,
			itoa(r.Planned),
			itoa(r.Published),
			itoa(r.Unverified),
			fmtPercent(r.Realization) + "%",
		}
		for j, cell := range cells {
			if j > 0 {
				sb.WriteString(",")
			}
			sb.WriteString(csvEscape(cell))
		}
		sb.WriteString("\n")
	}

	// --- Platform breakdown ---
	sb.WriteString("\nPLATFORM BREAKDOWN\n")
	sb.WriteString("Platform,Planned,Published,Verified,Unverified,Realization Rate\n")
	for _, r := range data["platform_breakdown"].([]platformBreakdownRow) {
		cells := []string{
			r.Platform,
			itoa(r.Planned),
			itoa(r.Published),
			itoa(r.Verified),
			itoa(r.Unverified),
			fmtPercent(r.Realization) + "%",
		}
		for j, cell := range cells {
			if j > 0 {
				sb.WriteString(",")
			}
			sb.WriteString(csvEscape(cell))
		}
		sb.WriteString("\n")
	}

	// --- Detail rows ---
	sb.WriteString("\nDETAIL\n")
	sb.WriteString("ID,Title,Topic,Pillar Code,Pillar,Platform,Status,Planned Date,Published Date,Verified\n")
	for _, r := range data["detail"].([]recapDetailRow) {
		publishedDate := ""
		if r.PublishedDate != nil {
			publishedDate = *r.PublishedDate
		}
		verified := "No"
		if r.PublishVerified {
			verified = "Yes"
		}
		cells := []string{
			r.ID,
			r.Title,
			r.Topic,
			derefStringPtr(r.PillarCode),
			derefStringPtr(r.Pillar),
			derefStringPtr(r.Platform),
			r.Status,
			derefStringPtr(r.PlannedDate),
			publishedDate,
			verified,
		}
		for j, cell := range cells {
			if j > 0 {
				sb.WriteString(",")
			}
			sb.WriteString(csvEscape(cell))
		}
		sb.WriteString("\n")
	}

	filename := "recap-" + strings.ToLower(strings.ReplaceAll(label, " ", "-")) + "-" + time.Now().Format("2006-01-02") + ".csv"
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Data(http.StatusOK, "text/csv; charset=utf-8", []byte(sb.String()))
}

// --- helpers ---

func atoiSafe(s string) (int, error) {
	return strconv.Atoi(strings.TrimSpace(s))
}

func derefStringPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func fmtPercent(v float64) string {
	return strconv.FormatFloat(v, 'f', 2, 64)
}
