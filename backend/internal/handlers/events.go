package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ImportantEvent struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Day         int     `json:"day"`
	Month       int     `json:"month"`
	Year        *int    `json:"year,omitempty"`
	Category    string  `json:"category"`
	Status      string  `json:"status"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   timeDb  `json:"created_at"`
}

// GET /api/important-events
func (h *Handler) ListImportantEvents(c *gin.Context) {
	where := []string{"is_active = TRUE"}
	args := []any{}

	if mStr := c.Query("month"); mStr != "" {
		if m, err := strconv.Atoi(mStr); err == nil && m >= 1 && m <= 12 {
			args = append(args, m)
			where = append(where, "month = $"+strconv.Itoa(len(args)))
		}
	}

	if yStr := c.Query("year"); yStr != "" {
		if y, err := strconv.Atoi(yStr); err == nil && y > 1900 {
			args = append(args, y)
			where = append(where, "(year IS NULL OR year = $"+strconv.Itoa(len(args))+")")
		}
	} else {
		// If no year specified, default to recurring events or current year events
		where = append(where, "year IS NULL")
	}

	if cat := c.Query("category"); cat != "" && cat != "ALL" {
		args = append(args, cat)
		where = append(where, "category = $"+strconv.Itoa(len(args)))
	}

	query := `SELECT id, name, day, month, year, category, status, description, is_active, created_at 
	          FROM important_events 
	          WHERE ` + strings.Join(where, " AND ") + ` 
	          ORDER BY month ASC, day ASC, name ASC`

	rows, err := h.Pool.Query(h.ctx(), query, args...)
	if err != nil {
		log.Printf("ListImportantEvents query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data hari peringatan"})
		return
	}
	defer rows.Close()

	events := []ImportantEvent{}
	for rows.Next() {
		var ev ImportantEvent
		var desc *string
		var yr *int
		var created timeDb
		if err := rows.Scan(&ev.ID, &ev.Name, &ev.Day, &ev.Month, &yr, &ev.Category, &ev.Status, &desc, &ev.IsActive, &created); err == nil {
			ev.Description = desc
			ev.Year = yr
			ev.CreatedAt = created
			events = append(events, ev)
		}
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}
