package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/ai"
	"pln-backend/internal/auth"
)

func (h *Handler) logAIRequest(c *gin.Context, requestType string, inputData any) string {
	user := auth.FromContext(c)
	data, _ := json.Marshal(inputData)
	var id string
	if user != nil {
		_ = h.Pool.QueryRow(h.ctx(), `
			INSERT INTO ai_requests (request_type, input_data, created_by) VALUES ($1, $2, $3) RETURNING id
		`, requestType, data, user.ID).Scan(&id)
	} else {
		_ = h.Pool.QueryRow(h.ctx(), `
			INSERT INTO ai_requests (request_type, input_data) VALUES ($1, $2) RETURNING id
		`, requestType, data).Scan(&id)
	}
	return id
}

func (h *Handler) logAIOutput(requestID string, outputData any, model string) {
	if requestID == "" {
		return
	}
	data, _ := json.Marshal(outputData)
	_, _ = h.Pool.Exec(h.ctx(), `
		INSERT INTO ai_outputs (request_id, output_data, model_used) VALUES ($1, $2, $3)
	`, requestID, data, model)
}

// POST /api/ai/generate-content
func (h *Handler) AIGenerateContent(c *gin.Context) {
	var in ai.GenerateContentInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "topic is required"})
		return
	}
	out := ai.GenerateContent(in)
	c.JSON(http.StatusOK, gin.H{"result": out, "generatedAt": ai.GeneratedAt()})
}

// POST /api/ai/improve-content
func (h *Handler) AIImproveContent(c *gin.Context) {
	var in ai.ImproveContentInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}
	out := ai.ImproveContent(in)
	reqID := h.logAIRequest(c, "CONTENT_IMPROVEMENT", in)
	h.logAIOutput(reqID, out, "mock-provider-v1")
	c.JSON(http.StatusOK, gin.H{"result": out, "generatedAt": ai.GeneratedAt()})
}

// POST /api/ai/review-content
func (h *Handler) AIReviewContent(c *gin.Context) {
	var in ai.ReviewContentInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}
	out := ai.ReviewContent(in)
	reqID := h.logAIRequest(c, "CONTENT_REVIEW", in)
	h.logAIOutput(reqID, out, "mock-provider-v1")
	c.JSON(http.StatusOK, gin.H{"result": out, "generatedAt": ai.GeneratedAt()})
}

// POST /api/ai/analyze-performance
func (h *Handler) AIAnalyzePerformance(c *gin.Context) {
	f := readFilters(c)
	kpis := h.dashboardKPIs(f)

	contentMap := kpis["content"].(gin.H)
	perfMap := kpis["performance"].(gin.H)

	totalContent := toInt(contentMap["total"])
	published := toInt(contentMap["published"])
	totalViews := toInt(perfMap["totalViews"])
	totalLikes := toInt(perfMap["totalLikes"])
	avgRate := toFloat(perfMap["avgEngagementRate"])

	out := ai.AnalyzePerformance(avgRate, totalViews, totalLikes, totalContent, published)
	reqID := h.logAIRequest(c, "PERFORMANCE_ANALYSIS", gin.H{"filters": f})
	h.logAIOutput(reqID, out, "mock-provider-v1")
	c.JSON(http.StatusOK, gin.H{"result": out, "generatedAt": ai.GeneratedAt()})
}

// POST /api/ai/recommendations
func (h *Handler) AIRecommendations(c *gin.Context) {
	pillarPerf := h.pillarPerformance(readFilters(c))
	underperforming := []string{}
	for _, p := range pillarPerf {
		if p.AvgEngagementRate < 3 {
			underperforming = append(underperforming, p.Pillar)
		}
	}
	out := ai.GenerateRecommendations(underperforming)
	reqID := h.logAIRequest(c, "RECOMMENDATION", nil)
	h.logAIOutput(reqID, out, "mock-provider-v1")
	c.JSON(http.StatusOK, gin.H{"result": out, "generatedAt": ai.GeneratedAt()})
}

func toInt(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	}
	return 0
}

func toFloat(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	}
	return 0
}
