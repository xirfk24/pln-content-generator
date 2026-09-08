package handlers

import (
	"context"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ctx() context.Context { return context.Background() }

type analyticsFilters struct {
	dateFrom   string
	dateTo     string
	platformID string
	pillarID   string
	status     string
}

func readFilters(c *gin.Context) analyticsFilters {
	return analyticsFilters{
		dateFrom:   c.Query("date_from"),
		dateTo:     c.Query("date_to"),
		platformID: c.Query("platform_id"),
		pillarID:   c.Query("pillar_id"),
		status:     c.Query("status"),
	}
}

type analyticsContentRow struct {
	ID            string
	Status        string
	PlannedDate   *string
	PillarName    *string
	PlatformName  *string
	Title         string
}

func (h *Handler) loadFilteredContents(f analyticsFilters, needTitle, needPlatform bool) []analyticsContentRow {
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
	if f.pillarID != "" {
		args = append(args, f.pillarID)
		where = append(where, "c.pillar_id = $"+itoa(len(args)))
	}
	if f.platformID != "" {
		args = append(args, f.platformID)
		where = append(where, "c.platform_id = $"+itoa(len(args)))
	}
	if f.status != "" {
		args = append(args, f.status)
		where = append(where, "c.status = $"+itoa(len(args)))
	}

	query := `SELECT c.id, c.status, c.planned_date::TEXT, pi.name, pl.name` + map[bool]string{true: ", c.title", false: ""}[needTitle] + `
		FROM contents c
		LEFT JOIN pillars pi ON pi.id = c.pillar_id
		LEFT JOIN platforms pl ON pl.id = c.platform_id
		WHERE ` + strings.Join(where, " AND ")

	rows, err := h.Pool.Query(h.ctx(), query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := []analyticsContentRow{}
	for rows.Next() {
		var r analyticsContentRow
		var err error
		if needTitle {
			err = rows.Scan(&r.ID, &r.Status, &r.PlannedDate, &r.PillarName, &r.PlatformName, &r.Title)
		} else {
			err = rows.Scan(&r.ID, &r.Status, &r.PlannedDate, &r.PillarName, &r.PlatformName)
		}
		if err != nil {
			continue
		}
		out = append(out, r)
	}
	return out
}

type metricAgg struct {
	Views    int `json:"views"`
	Likes    int `json:"likes"`
	Comments int `json:"comments"`
	Shares   int `json:"shares"`
	Saves    int `json:"saves"`
	Reach    int `json:"reach"`
}

// loadMetricsForContents returns aggregated metrics keyed by content id,
// and publication info rows for trend computation.
type pubInfo struct {
	id                string
	contentID         string
	platformID        *string
	actualPublishDate *string
}

func (h *Handler) loadPublicationsForContents(contentIDs []string, filterPlatformID string) []pubInfo {
	if len(contentIDs) == 0 {
		return nil
	}
	query := `SELECT id, content_id, platform_id, actual_publish_date::TEXT FROM publications WHERE content_id = ANY($1)`
	args := []any{contentIDs}
	if filterPlatformID != "" {
		args = append(args, filterPlatformID)
		query += ` AND platform_id = $2`
	}
	rows, err := h.Pool.Query(h.ctx(), query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := []pubInfo{}
	for rows.Next() {
		var p pubInfo
		if err := rows.Scan(&p.id, &p.contentID, &p.platformID, &p.actualPublishDate); err != nil {
			log.Printf("loadPublicationsForContents scan error: %v", err)
			continue
		}
		out = append(out, p)
	}
	return out
}

func (h *Handler) loadMetricsForPubs(pubIDs []string) map[string]*metricAgg {
	byPub := map[string]*metricAgg{}
	if len(pubIDs) == 0 {
		return byPub
	}
	rows, err := h.Pool.Query(h.ctx(), `
		SELECT publication_id, views, likes, comments, shares, saves, reach
		FROM performance_metrics WHERE publication_id = ANY($1)`, pubIDs)
	if err != nil {
		return byPub
	}
	defer rows.Close()

	for rows.Next() {
		var pubID string
		var m metricAgg
		if err := rows.Scan(&pubID, &m.Views, &m.Likes, &m.Comments, &m.Shares, &m.Saves, &m.Reach); err != nil {
			continue
		}
		if agg, ok := byPub[pubID]; ok {
			agg.Views += m.Views
			agg.Likes += m.Likes
			agg.Comments += m.Comments
			agg.Shares += m.Shares
			agg.Saves += m.Saves
			agg.Reach += m.Reach
		} else {
			copy := m
			byPub[pubID] = &copy
		}
	}
	return byPub
}

// GET /api/analytics
func (h *Handler) Analytics(c *gin.Context) {
	f := readFilters(c)

	metricParam := c.Query("metric")
	rankMetric := "views"
	if metricParam == "engagementRate" || metricParam == "likes" || metricParam == "shares" {
		rankMetric = metricParam
	}

	c.JSON(http.StatusOK, gin.H{
		"kpis":               h.dashboardKPIs(f),
		"platformPerformance": h.platformPerformance(f),
		"pillarPerformance":  h.pillarPerformance(f),
		"monthlyTrend":       h.monthlyTrend(f),
		"topContent":         h.topContent(f, rankMetric, 10),
		"rankMetric":         rankMetric,
	})
}

func (h *Handler) dashboardKPIs(f analyticsFilters) gin.H {
	// Content query ignores platform filter here, mirroring the original service.
	contentWhere := []string{"TRUE"}
	args := []any{}
	if f.dateFrom != "" {
		args = append(args, f.dateFrom)
		contentWhere = append(contentWhere, "planned_date >= $"+itoa(len(args)))
	}
	if f.dateTo != "" {
		args = append(args, f.dateTo)
		contentWhere = append(contentWhere, "planned_date <= $"+itoa(len(args)))
	}
	if f.pillarID != "" {
		args = append(args, f.pillarID)
		contentWhere = append(contentWhere, "pillar_id = $"+itoa(len(args)))
	}

	rows, err := h.Pool.Query(h.ctx(),
		"SELECT id, status FROM contents WHERE "+strings.Join(contentWhere, " AND "), args...)
	if err != nil {
		return gin.H{}
	}
	defer rows.Close()

	statusCount := map[string]int{}
	total := 0
	contentIDs := []string{}
	for rows.Next() {
		var id, status string
		if err := rows.Scan(&id, &status); err != nil {
			continue
		}
		contentIDs = append(contentIDs, id)
		statusCount[status]++
		total++
	}

	totals := metricAgg{}
	rates := []float64{}

	pubs := h.loadPublicationsForContents(contentIDs, f.platformID)
	if len(pubs) > 0 {
		pubIDs := make([]string, len(pubs))
		for i, p := range pubs {
			pubIDs[i] = p.id
		}
		byPub := h.loadMetricsForPubs(pubIDs)
		for _, agg := range byPub {
			totals.Views += agg.Views
			totals.Likes += agg.Likes
			totals.Comments += agg.Comments
			totals.Shares += agg.Shares
			totals.Saves += agg.Saves
			totals.Reach += agg.Reach
			if agg.Reach > 0 {
				rates = append(rates, calculateEngagementRate(agg.Likes, agg.Comments, agg.Shares, agg.Saves, agg.Reach))
			}
		}
	}

	avgRate := 0.0
	if len(rates) > 0 {
		sum := 0.0
		for _, r := range rates {
			sum += r
		}
		avgRate = sum / float64(len(rates))
	}

	return gin.H{
		"content": gin.H{
			"total":          total,
			"planned":        statusCount["PLANNED"],
			"inProgress":     statusCount["IN_PROGRESS"],
			"pendingReview":  statusCount["PENDING_REVIEW"],
			"approved":       statusCount["APPROVED"],
			"readyToPublish": statusCount["READY_TO_PUBLISH"],
			"published":      statusCount["PUBLISHED"],
			"rescheduled":    statusCount["RESCHEDULED"],
			"notRealized":    statusCount["NOT_REALIZED"],
		},
		"performance": gin.H{
			"totalViews":       totals.Views,
			"totalLikes":       totals.Likes,
			"totalComments":    totals.Comments,
			"totalShares":      totals.Shares,
			"totalSaves":       totals.Saves,
			"totalReach":       totals.Reach,
			"avgEngagementRate": avgRate,
		},
	}
}

func (h *Handler) statusBreakdown(f analyticsFilters) []gin.H {
	all := h.loadFilteredContents(f, false, false)
	counts := map[string]int{}
	for _, r := range all {
		counts[r.Status]++
	}
	out := []gin.H{}
	// stable order by status name for deterministic output
	keys := make([]string, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		label := k
		if l, ok := statusLabels[k]; ok {
			label = l
		}
		out = append(out, gin.H{"status": k, "label": label, "count": counts[k]})
	}
	return out
}

type platformPerfRow struct {
	Platform     string `json:"platform"`
	ContentCount int    `json:"contentCount"`
	metricAgg
	EngagementRate float64 `json:"engagementRate"`
}

func (h *Handler) platformPerformance(f analyticsFilters) []platformPerfRow {
	all := h.loadFilteredContents(f, false, false)
	platformCount := map[string]int{}
	contentPlatform := map[string]string{}
	for _, r := range all {
		name := "Unknown"
		if r.PlatformName != nil && *r.PlatformName != "" {
			name = *r.PlatformName
		}
		platformCount[name]++
		contentPlatform[r.ID] = name
	}

	rows := map[string]*platformPerfRow{}
	order := []string{}
	for name, count := range platformCount {
		rows[name] = &platformPerfRow{Platform: name, ContentCount: count}
		order = append(order, name)
	}

	contentIDs := make([]string, len(all))
	for i, r := range all {
		contentIDs[i] = r.ID
	}
	pubs := h.loadPublicationsForContents(contentIDs, "")
	pubIDs := make([]string, len(pubs))
	for i, p := range pubs {
		pubIDs[i] = p.id
	}
	byPub := h.loadMetricsForPubs(pubIDs)
	for _, p := range pubs {
		name := contentPlatform[p.contentID]
		if name == "" {
			name = "Unknown"
		}
		row := rows[name]
		if row == nil {
			continue
		}
		if agg := byPub[p.id]; agg != nil {
			row.Views += agg.Views
			row.Likes += agg.Likes
			row.Comments += agg.Comments
			row.Shares += agg.Shares
			row.Saves += agg.Saves
			row.Reach += agg.Reach
		}
	}

	out := make([]platformPerfRow, 0, len(rows))
	for _, name := range order {
		if name == "Unknown" {
			continue
		}
		row := rows[name]
		row.EngagementRate = 0
		if row.Reach > 0 {
			row.EngagementRate = float64(row.Likes+row.Comments+row.Shares+row.Saves) / float64(row.Reach) * 100
		}
		out = append(out, *row)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Views > out[j].Views })
	return out
}

type pillarPerfRow struct {
	Pillar         string `json:"pillar"`
	ContentCount   int    `json:"contentCount"`
	PublishedCount int    `json:"publishedCount"`
	Views          int    `json:"views"`
	Reach          int    `json:"reach"`
	AvgViews       int    `json:"avgViews"`
	TotalEngagement int   `json:"totalEngagement"`
	AvgEngagementRate float64 `json:"avgEngagementRate"`
}

func (h *Handler) pillarPerformance(f analyticsFilters) []pillarPerfRow {
	all := h.loadFilteredContents(f, false, false)
	rows := map[string]*pillarPerfRow{}
	order := []string{}
	for _, r := range all {
		name := "Unknown"
		if r.PillarName != nil && *r.PillarName != "" {
			name = *r.PillarName
		}
		if _, ok := rows[name]; !ok {
			rows[name] = &pillarPerfRow{Pillar: name}
			order = append(order, name)
		}
		rows[name].ContentCount++
		if r.Status == "PUBLISHED" {
			rows[name].PublishedCount++
		}
	}

	contentIDs := make([]string, len(all))
	for i, r := range all {
		contentIDs[i] = r.ID
	}
	pubs := h.loadPublicationsForContents(contentIDs, "")
	pubToContent := map[string]string{}
	pubIDs := make([]string, len(pubs))
	for i, p := range pubs {
		pubToContent[p.id] = p.contentID
		pubIDs[i] = p.id
	}

	contentPillar := map[string]string{}
	for _, r := range all {
		name := "Unknown"
		if r.PillarName != nil && *r.PillarName != "" {
			name = *r.PillarName
		}
		contentPillar[r.ID] = name
	}

	byPub := h.loadMetricsForPubs(pubIDs)
	for _, p := range pubs {
		name := contentPillar[pubToContent[p.id]]
		row := rows[name]
		if row == nil {
			continue
		}
		if agg := byPub[p.id]; agg != nil {
			row.Views += agg.Views
			row.Reach += agg.Reach
			row.TotalEngagement += agg.Likes + agg.Comments + agg.Shares + agg.Saves
		}
	}

	out := make([]pillarPerfRow, 0, len(rows))
	for _, name := range order {
		if name == "Unknown" {
			continue
		}
		row := rows[name]
		if row.PublishedCount > 0 {
			row.AvgViews = int(float64(row.Views)/float64(row.PublishedCount) + 0.5)
		}
		if row.Reach > 0 {
			row.AvgEngagementRate = float64(row.TotalEngagement) / float64(row.Reach) * 100
		}
		out = append(out, *row)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Views > out[j].Views })
	return out
}

type monthlyTrendRow struct {
	Month          string `json:"month"`
	Label          string `json:"label"`
	Planned        int    `json:"planned"`
	Published      int    `json:"published"`
	RealizationRate float64 `json:"realizationRate"`
	Views          int    `json:"views"`
	Likes          int    `json:"likes"`
	EngagementRate float64 `json:"engagementRate"`
}

func (h *Handler) monthlyTrend(f analyticsFilters) []monthlyTrendRow {
	all := h.loadFilteredContents(f, false, false)

	byMonth := map[string]*[2]int{} // [planned, published]
	for _, r := range all {
		if r.PlannedDate == nil || *r.PlannedDate == "" {
			continue
		}
		key := monthKey(*r.PlannedDate)
		if _, ok := byMonth[key]; !ok {
			byMonth[key] = &[2]int{}
		}
		byMonth[key][0]++
		if r.Status == "PUBLISHED" {
			byMonth[key][1]++
		}
	}

	contentIDs := make([]string, len(all))
	for i, r := range all {
		contentIDs[i] = r.ID
	}
	pubs := h.loadPublicationsForContents(contentIDs, "")
	pubIDs := make([]string, len(pubs))
	for i, p := range pubs {
		pubIDs[i] = p.id
	}
	byPub := h.loadMetricsForPubs(pubIDs)

	pubMonthAgg := map[string]*struct{ views, likes, reach, engagement int }{}
	for _, p := range pubs {
		if p.actualPublishDate == nil || *p.actualPublishDate == "" {
			continue
		}
		key := monthKey(*p.actualPublishDate)
		if _, ok := pubMonthAgg[key]; !ok {
			pubMonthAgg[key] = &struct{ views, likes, reach, engagement int }{}
		}
		if agg := byPub[p.id]; agg != nil {
			a := pubMonthAgg[key]
			a.views += agg.Views
			a.likes += agg.Likes
			a.reach += agg.Reach
			a.engagement += agg.Likes + agg.Comments + agg.Shares + agg.Saves
		}
	}

	months := map[string]bool{}
	for k := range byMonth {
		months[k] = true
	}
	for k := range pubMonthAgg {
		months[k] = true
	}
	keys := make([]string, 0, len(months))
	for k := range months {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	out := []monthlyTrendRow{}
	for _, key := range keys {
		planned, published := 0, 0
		if v, ok := byMonth[key]; ok {
			planned, published = v[0], v[1]
		}
		row := monthlyTrendRow{
			Month:  key,
			Label:  monthLabel(key),
			Planned: planned,
			Published: published,
		}
		if planned > 0 {
			row.RealizationRate = float64(published) / float64(planned) * 100
		}
		if agg := pubMonthAgg[key]; agg != nil {
			row.Views = agg.views
			row.Likes = agg.likes
			if agg.reach > 0 {
				row.EngagementRate = float64(agg.engagement) / float64(agg.reach) * 100
			}
		}
		out = append(out, row)
	}
	return out
}

type topContentRow struct {
	ContentID      string `json:"contentId"`
	Title          string `json:"title"`
	Platform       string `json:"platform"`
	metricAgg
	EngagementRate float64 `json:"engagementRate"`
}

func (h *Handler) topContent(f analyticsFilters, metric string, limit int) []topContentRow {
	all := h.loadFilteredContents(f, true, true)
	contentByID := map[string]analyticsContentRow{}
	for _, r := range all {
		contentByID[r.ID] = r
	}

	contentIDs := make([]string, len(all))
	for i, r := range all {
		contentIDs[i] = r.ID
	}
	pubs := h.loadPublicationsForContents(contentIDs, "")
	pubToContent := map[string]string{}
	pubIDs := make([]string, len(pubs))
	for i, p := range pubs {
		pubToContent[p.id] = p.contentID
		pubIDs[i] = p.id
	}

	agg := map[string]*topContentRow{}
	byPub := h.loadMetricsForPubs(pubIDs)
	for _, p := range pubs {
		contentID := pubToContent[p.id]
		ct, ok := contentByID[contentID]
		if !ok {
			continue
		}
		row := agg[contentID]
		if row == nil {
			platform := "-"
			if ct.PlatformName != nil && *ct.PlatformName != "" {
				platform = *ct.PlatformName
			}
			row = &topContentRow{ContentID: contentID, Title: ct.Title, Platform: platform}
			agg[contentID] = row
		}
		if m := byPub[p.id]; m != nil {
			row.Views += m.Views
			row.Likes += m.Likes
			row.Comments += m.Comments
			row.Shares += m.Shares
			row.Saves += m.Saves
			row.Reach += m.Reach
		}
	}

	out := make([]topContentRow, 0, len(agg))
	for _, row := range agg {
		if row.Reach > 0 {
			row.EngagementRate = float64(row.Likes+row.Comments+row.Shares+row.Saves) / float64(row.Reach) * 100
		}
		out = append(out, *row)
	}

	sort.Slice(out, func(i, j int) bool {
		switch metric {
		case "engagementRate":
			return out[i].EngagementRate > out[j].EngagementRate
		case "likes":
			return out[i].Likes > out[j].Likes
		case "shares":
			return out[i].Shares > out[j].Shares
		default:
			return out[i].Views > out[j].Views
		}
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

var pillarCodeRe = regexp.MustCompile(`^([A-Z])\s*-\s*(.+)$`)

// GET /api/analytics/topic-recap
func (h *Handler) TopicRecap(c *gin.Context) {
	f := readFilters(c)

	where := []string{"c.pillar_id IS NOT NULL"}
	args := []any{}
	if f.dateFrom != "" {
		args = append(args, f.dateFrom)
		where = append(where, "c.planned_date >= $"+itoa(len(args)))
	}
	if f.dateTo != "" {
		args = append(args, f.dateTo)
		where = append(where, "c.planned_date <= $"+itoa(len(args)))
	}
	if f.pillarID != "" {
		args = append(args, f.pillarID)
		where = append(where, "c.pillar_id = $"+itoa(len(args)))
	}
	if f.platformID != "" {
		args = append(args, f.platformID)
		where = append(where, "c.platform_id = $"+itoa(len(args)))
	}
	if f.status != "" {
		args = append(args, f.status)
		where = append(where, "c.status = $"+itoa(len(args)))
	}

	rows, err := h.Pool.Query(h.ctx(), `
		SELECT pi.name FROM contents c JOIN pillars pi ON pi.id = c.pillar_id
		WHERE `+strings.Join(where, " AND "), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recap"})
		return
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var name *string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		if name == nil || *name == "" {
			continue
		}
		counts[*name]++
	}

	type recapRow struct {
		Code  string `json:"code"`
		Topic string `json:"topic"`
		Count int    `json:"count"`
	}
	recap := []recapRow{}
	for name, count := range counts {
		row := recapRow{Code: "?", Topic: name, Count: count}
		if m := pillarCodeRe.FindStringSubmatch(name); m != nil {
			row.Code = m[1]
			row.Topic = m[2]
		}
		recap = append(recap, row)
	}
	sort.Slice(recap, func(i, j int) bool { return recap[i].Code < recap[j].Code })

	total := 0
	for _, r := range recap {
		total += r.Count
	}
	c.JSON(http.StatusOK, gin.H{"recap": recap, "total": total})
}
