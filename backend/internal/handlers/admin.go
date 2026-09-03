package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type masterInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
}

// Generic master-data CRUD used by admin routes.
func (h *Handler) ListMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		cols := "id, name, description, created_at"
		if hasIcon {
			cols = "id, name, description, icon, created_at"
		}
		rows, err := h.Pool.Query(h.ctx(), "SELECT "+cols+" FROM "+table+" ORDER BY name")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch"})
			return
		}
		defer rows.Close()

		items := []map[string]any{}
		for rows.Next() {
			var id, name string
			var desc *string
			var created timeDb
			var icon *string
			var scanErr error
			if hasIcon {
				scanErr = rows.Scan(&id, &name, &desc, &icon, &created)
			} else {
				scanErr = rows.Scan(&id, &name, &desc, &created)
			}
			if scanErr != nil {
				continue
			}
			item := map[string]any{"id": id, "name": name, "description": desc, "created_at": created}
			if hasIcon {
				item["icon"] = icon
			}
			items = append(items, item)
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	}
}

func (h *Handler) CreateMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in masterInput
		if err := c.ShouldBindJSON(&in); err != nil || in.Name == nil || *in.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
			return
		}

		var id string
		var err error
		if hasIcon {
			err = h.Pool.QueryRow(h.ctx(),
				"INSERT INTO "+table+" (name, description, icon) VALUES ($1,$2,$3) RETURNING id",
				*in.Name, in.Description, in.Icon).Scan(&id)
		} else {
			err = h.Pool.QueryRow(h.ctx(),
				"INSERT INTO "+table+" (name, description) VALUES ($1,$2) RETURNING id",
				*in.Name, in.Description).Scan(&id)
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"item": map[string]any{"id": id, "name": *in.Name, "description": in.Description}})
	}
}

func (h *Handler) UpdateMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var in masterInput
		if err := c.ShouldBindJSON(&in); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		setClauses := []string{}
		args := []any{}
		add := func(col string, val any) {
			args = append(args, val)
			setClauses = append(setClauses, col+" = $"+itoa(len(args)))
		}
		if in.Name != nil {
			add("name", *in.Name)
		}
		if in.Description != nil {
			add("description", *in.Description)
		}
		if hasIcon && in.Icon != nil {
			add("icon", *in.Icon)
		}
		if len(setClauses) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
			return
		}
		args = append(args, id)
		res, err := h.Pool.Exec(h.ctx(),
			"UPDATE "+table+" SET "+joinComma(setClauses)+" WHERE id = $"+itoa(len(args)), args...)
		if err != nil || res.RowsAffected() == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"item": map[string]any{"id": id}})
	}
}

func (h *Handler) DeleteMaster(table string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		res, err := h.Pool.Exec(h.ctx(), "DELETE FROM "+table+" WHERE id = $1", id)
		if err != nil || res.RowsAffected() == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GET /api/admin/users
func (h *Handler) ListUsers(c *gin.Context) {
	rows, err := h.Pool.Query(h.ctx(), `
		SELECT id, email, full_name, role, is_active, created_at, updated_at
		FROM profiles ORDER BY created_at`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	defer rows.Close()

	users := []map[string]any{}
	for rows.Next() {
		var id, email, role string
		var fullName *string
		var isActive *bool
		var createdAt, updatedAt timeDb
		if err := rows.Scan(&id, &email, &fullName, &role, &isActive, &createdAt, &updatedAt); err != nil {
			continue
		}
		users = append(users, map[string]any{
			"id": id, "email": email, "full_name": fullName, "role": role,
			"is_active": isActive, "created_at": createdAt, "updated_at": updatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

type updateUserInput struct {
	UserID   *string `json:"userId"`
	Role     *string `json:"role"`
	IsActive *bool   `json:"is_active"`
	FullName *string `json:"full_name"`
}

// PUT /api/admin/users
func (h *Handler) UpdateUser(c *gin.Context) {
	var in updateUserInput
	if err := c.ShouldBindJSON(&in); err != nil || in.UserID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	setClauses := []string{"updated_at = now()"}
	args := []any{}
	add := func(col string, val any) {
		args = append(args, val)
		setClauses = append(setClauses, col+" = $"+itoa(len(args)))
	}
	if in.Role != nil {
		add("role", *in.Role)
	}
	if in.IsActive != nil {
		add("is_active", *in.IsActive)
	}
	if in.FullName != nil {
		add("full_name", *in.FullName)
	}
	args = append(args, *in.UserID)
	res, err := h.Pool.Exec(h.ctx(),
		"UPDATE profiles SET "+joinComma(setClauses)+" WHERE id = $"+itoa(len(args)), args...)
	if err != nil || res.RowsAffected() == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	var role string
	var isActive *bool
	var fullName *string
	_ = h.Pool.QueryRow(h.ctx(),
		"SELECT role, is_active, full_name FROM profiles WHERE id = $1", *in.UserID).
		Scan(&role, &isActive, &fullName)

	c.JSON(http.StatusOK, gin.H{"user": map[string]any{
		"id": *in.UserID, "role": role, "is_active": isActive, "full_name": fullName,
	}})
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}
