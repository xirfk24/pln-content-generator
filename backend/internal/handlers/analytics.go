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

// ctx returns a background context for internal helper functions that are
// called across multiple endpoints and therefore cannot pin themselves to a
// single request's lifecycle. Handler-level callers should pass
// c.Request.Context() instead for proper cancellation on client disconnect.
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
	ID           string
	Status       string
	PlannedDate  *string
	PillarName   *string
	PlatformName *string
	Title        string
}

func (h *Handler) loadFilteredContents(f analyticsFilters, needTitle bool) []analyticsContentRow {
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
		"kpis":                h.dashboardKPIs(f),
		"platformPerformance": h.platformPerformance(f),
		"pillarPerformance":   h.pillarPerformance(f),
		"monthlyTrend":        h.monthlyTrend(f),
		"semesterTrend":       h.semesterTrend(f),
		"topContent":          h.topContent(f, rankMetric, 10),
		"rankMetric":          rankMetric,
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

	// Count published based on publications table, not content.status.
	// A content is "published" if it has at least one publication with actual_publish_date.
	publishedByContent := map[string]bool{}
	for _, p := range pubs {
		if p.actualPublishDate != nil && *p.actualPublishDate != "" {
			publishedByContent[p.contentID] = true
		}
	}
	publishedCount := len(publishedByContent)

	draftCount := statusCount["DRAFT"] + statusCount["PLANNED"]
	return gin.H{
		"content": gin.H{
			"total":             total,
			"draft":             draftCount,
			"planned":           draftCount, // backward compatibility
			"inProgress":        statusCount["IN_PROGRESS"],
			"pendingReview":     statusCount["PENDING_REVIEW"],
			"approved":          statusCount["APPROVED"],
			"readyToPublish":    statusCount["READY_TO_PUBLISH"],
			"published":         publishedCount,
			"publishedByStatus": statusCount["PUBLISHED"], // kept for reference
			"rescheduled":       statusCount["RESCHEDULED"],
			"notRealized":       statusCount["NOT_REALIZED"],
		},
		"performance": gin.H{
			"totalViews":        totals.Views,
			"totalLikes":        totals.Likes,
			"totalComments":     totals.Comments,
			"totalShares":       totals.Shares,
			"totalSaves":        totals.Saves,
			"totalReach":        totals.Reach,
			"avgEngagementRate": avgRate,
		},
	}
}

func (h *Handler) statusBreakdown(f analyticsFilters) []gin.H {
	all := h.loadFilteredContents(f, false)
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
	all := h.loadFilteredContents(f, false)
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
	Pillar            string  `json:"pillar"`
	ContentCount      int     `json:"contentCount"`
	PublishedCount    int     `json:"publishedCount"`
	Views             int     `json:"views"`
	Reach             int     `json:"reach"`
	AvgViews          int     `json:"avgViews"`
	TotalEngagement   int     `json:"totalEngagement"`
	AvgEngagementRate float64 `json:"avgEngagementRate"`
}

func (h *Handler) pillarPerformance(f analyticsFilters) []pillarPerfRow {
	all := h.loadFilteredContents(f, false)
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

	// Published content = has at least one publication with actual_publish_date
	publishedContentIDs := map[string]bool{}
	for _, p := range pubs {
		if p.actualPublishDate != nil && *p.actualPublishDate != "" {
			publishedContentIDs[p.contentID] = true
		}
	}

	contentPillar := map[string]string{}
	for _, r := range all {
		name := "Unknown"
		if r.PillarName != nil && *r.PillarName != "" {
			name = *r.PillarName
		}
		contentPillar[r.ID] = name
	}

	// Count published per pillar based on publications table
	for _, r := range all {
		if publishedContentIDs[r.ID] {
			name := contentPillar[r.ID]
			if row, ok := rows[name]; ok {
				row.PublishedCount++
			}
		}
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
	Month               string  `json:"month"`
	Label               string  `json:"label"`
	Planned             int     `json:"planned"`
	Published           int     `json:"published"`
	PublishedVerified   int     `json:"publishedVerified"`
	PublishedUnverified int     `json:"publishedUnverified"`
	RealizationRate     float64 `json:"realizationRate"`
	Views               int     `json:"views"`
	Likes               int     `json:"likes"`
	EngagementRate      float64 `json:"engagementRate"`
}

// monthlyTrend aggregates the plan vs realization trend per calendar month.
func (h *Handler) monthlyTrend(f analyticsFilters) []monthlyTrendRow {
	return h.periodTrend(f, monthKey, monthLabel)
}

// semesterTrend aggregates the plan vs realization trend per semester.
// Semester 1 = January–June, Semester 2 = July–December.
func (h *Handler) semesterTrend(f analyticsFilters) []monthlyTrendRow {
	return h.periodTrend(f, semesterKey, semesterLabel)
}

// periodTrend computes the planned vs published trend grouped by an
// arbitrary period key derived from ISO date strings (e.g. "2025-03" for
// monthly or "2025-S1" for semester grouping).
//
// Grouping rules (mirroring monthlyTrend semantics):
//   - planned: counted in the period of contents.planned_date
//   - published: counted in the period of contents.planned_date when the
//     content has at least one publication with actual_publish_date
//     (used for the realization rate)
//   - metrics (views/likes/ER): attributed to the period of
//     publications.actual_publish_date
func (h *Handler) periodTrend(f analyticsFilters, keyFn func(string) string, labelFn func(string) string) []monthlyTrendRow {
	all := h.loadFilteredContents(f, false)

	byMonth := map[string]*[2]int{} // [planned, published]
	for _, r := range all {
		if r.PlannedDate == nil || *r.PlannedDate == "" {
			continue
		}
		key := keyFn(*r.PlannedDate)
		if _, ok := byMonth[key]; !ok {
			byMonth[key] = &[2]int{}
		}
		byMonth[key][0]++ // planned count
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

	// Published count: based on publications with actual_publish_date.
	// Group by the month of actual_publish_date.
	publishedByMonth := map[string]*[2]int{} // [verified, unverified]
	for _, p := range pubs {
		if p.actualPublishDate == nil || *p.actualPublishDate == "" {
			continue
		}
		key := keyFn(*p.actualPublishDate)
		if _, ok := publishedByMonth[key]; !ok {
			publishedByMonth[key] = &[2]int{}
		}
		// actual_publish_date present → verified
		publishedByMonth[key][0]++
	}

	// Also count content as published per their planned_date month (for realization rate)
	// if they have at least one publication with actual_publish_date
	publishedContentIDs := map[string]bool{}
	for _, p := range pubs {
		if p.actualPublishDate != nil && *p.actualPublishDate != "" {
			publishedContentIDs[p.contentID] = true
		}
	}
	for _, r := range all {
		if r.PlannedDate == nil || *r.PlannedDate == "" {
			continue
		}
		if publishedContentIDs[r.ID] {
			key := keyFn(*r.PlannedDate)
			if _, ok := byMonth[key]; ok {
				byMonth[key][1]++ // published count in the month the content was planned
			}
		}
	}

	pubMonthAgg := map[string]*struct{ views, likes, reach, engagement int }{}
	for _, p := range pubs {
		if p.actualPublishDate == nil || *p.actualPublishDate == "" {
			continue
		}
		key := keyFn(*p.actualPublishDate)
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
		verified, unverified := 0, 0
		if v, ok := publishedByMonth[key]; ok {
			verified = v[0]
			unverified = v[1]
		}
		row := monthlyTrendRow{
			Month:               key,
			Label:               labelFn(key),
			Planned:             planned,
			Published:           published,
			PublishedVerified:   verified,
			PublishedUnverified: unverified,
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
	ContentID string `json:"contentId"`
	Title     string `json:"title"`
	Platform  string `json:"platform"`
	metricAgg
	EngagementRate float64 `json:"engagementRate"`
}

func (h *Handler) topContent(f analyticsFilters, metric string, limit int) []topContentRow {
	all := h.loadFilteredContents(f, true)
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

// topicRecapRow is one row of the topic recap: content count per topic code.
type topicRecapRow struct {
	Code  string `json:"code"`
	Topic string `json:"topic"`
	Count int    `json:"count"`
}

// buildTopicRecap aggregates content counts keyed by pillar name into one row
// per topic code, so codes stay unique. Pillar names without an "X - Topic"
// prefix all share the code "?" and are merged into a single "Tanpa Kode" row;
// the same holds for multiple names carrying the same letter prefix.
func buildTopicRecap(counts map[string]int) []topicRecapRow {
	type agg struct {
		count  int
		topics []string
	}
	byCode := map[string]*agg{}
	codes := []string{}
	for name, count := range counts {
		code, topic := "?", name
		if m := pillarCodeRe.FindStringSubmatch(name); m != nil {
			code, topic = m[1], m[2]
		}
		a := byCode[code]
		if a == nil {
			a = &agg{}
			byCode[code] = a
			codes = append(codes, code)
		}
		a.count += count
		a.topics = append(a.topics, topic)
	}

	sort.Slice(codes, func(i, j int) bool {
		// "?" (uncoded pillars) goes last, after A–Z.
		if (codes[i] == "?") != (codes[j] == "?") {
			return codes[j] == "?"
		}
		return codes[i] < codes[j]
	})

	recap := make([]topicRecapRow, 0, len(codes))
	for _, code := range codes {
		a := byCode[code]
		topic := strings.Join(a.topics, ", ")
		if code == "?" {
			topic = "Tanpa Kode"
		}
		recap = append(recap, topicRecapRow{Code: code, Topic: topic, Count: a.count})
	}
	return recap
}

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

	recap := buildTopicRecap(counts)

	total := 0
	for _, r := range recap {
		total += r.Count
	}
	c.JSON(http.StatusOK, gin.H{"recap": recap, "total": total})
}
