package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/dashboard
func (h *Handler) Dashboard(c *gin.Context) {
	f := readFilters(c)
	c.JSON(http.StatusOK, gin.H{
		"kpis":               h.dashboardKPIs(f),
		"statusBreakdown":    h.statusBreakdown(f),
		"platformPerformance": h.platformPerformance(f),
		"monthlyTrend":       h.monthlyTrend(f),
		"topContent":         h.topContent(f, "views", 5),
	})
}
