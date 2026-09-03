package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GET /api/master-data
func (h *Handler) MasterData(c *gin.Context) {
	pillars := []map[string]any{}
	categories := []map[string]any{}
	platforms := []map[string]any{}

	rows, err := h.Pool.Query(h.ctx(), "SELECT id, name, description, created_at FROM pillars ORDER BY name")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, name string
			var desc *string
			var created timeDb
			if rows.Scan(&id, &name, &desc, &created) == nil {
				pillars = append(pillars, map[string]any{"id": id, "name": name, "description": desc, "created_at": created})
			}
		}
		rows.Close()
	}

	rows, err = h.Pool.Query(h.ctx(), "SELECT id, name, description, created_at FROM categories ORDER BY name")
	if err == nil {
		for rows.Next() {
			var id, name string
			var desc *string
			var created timeDb
			if rows.Scan(&id, &name, &desc, &created) == nil {
				categories = append(categories, map[string]any{"id": id, "name": name, "description": desc, "created_at": created})
			}
		}
		rows.Close()
	}

	rows, err = h.Pool.Query(h.ctx(), "SELECT id, name, icon, created_at FROM platforms ORDER BY name")
	if err == nil {
		for rows.Next() {
			var id, name string
			var icon *string
			var created timeDb
			if rows.Scan(&id, &name, &icon, &created) == nil {
				platforms = append(platforms, map[string]any{"id": id, "name": name, "icon": icon, "created_at": created})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"pillars": pillars, "categories": categories, "platforms": platforms})
}
