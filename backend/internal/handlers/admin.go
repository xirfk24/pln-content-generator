package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// masterTables is the fixed whitelist of tables the generic master-data CRUD
// may touch. The `table` argument comes from route closures in main.go (not
// user input), but validating it here is defense-in-depth: a future code
// change that passes user-controlled input would otherwise allow SQL
// injection via table-name concatenation.
var masterTables = map[string]bool{
	"categories": true,
	"pillars":    true,
	"platforms":  true,
}

func validMasterTable(table string) bool {
	return masterTables[table]
}

type masterInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
}

// Generic master-data CRUD used by admin routes.
// hasIcon=true means the table has an "icon" column (e.g. platforms).
// Tables with icon typically don't have a "description" column, so we
// conditionally include/exclude both columns based on flags.
func (h *Handler) ListMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !validMasterTable(table) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid master table"})
			return
		}
		// platforms: id, name, icon, created_at (no description)
		// categories/pillars: id, name, description, created_at (no icon)
		cols := "id, name, description, created_at"
		if hasIcon {
			cols = "id, name, icon, created_at"
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
			var created timeDb
			var scanErr error
			item := map[string]any{}
			if hasIcon {
				var icon *string
				scanErr = rows.Scan(&id, &name, &icon, &created)
				item["icon"] = icon
			} else {
				var desc *string
				scanErr = rows.Scan(&id, &name, &desc, &created)
				item["description"] = desc
			}
			if scanErr != nil {
				continue
			}
			item["id"] = id
			item["name"] = name
			item["created_at"] = created
			items = append(items, item)
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	}
}

func (h *Handler) CreateMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !validMasterTable(table) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid master table"})
			return
		}
		var in masterInput
		if err := c.ShouldBindJSON(&in); err != nil || in.Name == nil || *in.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
			return
		}

		var id string
		var err error
		if hasIcon {
			// platforms: name, icon (no description)
			err = h.Pool.QueryRow(h.ctx(),
				"INSERT INTO "+table+" (name, icon) VALUES ($1,$2) RETURNING id",
				*in.Name, in.Icon).Scan(&id)
		} else {
			// categories/pillars: name, description (no icon)
			err = h.Pool.QueryRow(h.ctx(),
				"INSERT INTO "+table+" (name, description) VALUES ($1,$2) RETURNING id",
				*in.Name, in.Description).Scan(&id)
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create"})
			return
		}
		item := map[string]any{"id": id, "name": *in.Name}
		if hasIcon {
			item["icon"] = in.Icon
		} else {
			item["description"] = in.Description
		}
		c.JSON(http.StatusOK, gin.H{"item": item})
	}
}

func (h *Handler) UpdateMaster(table string, hasIcon bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !validMasterTable(table) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid master table"})
			return
		}
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
		// Only update description for tables that have it (categories, pillars)
		// platforms table has no description column
		if !hasIcon && in.Description != nil {
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
		if !validMasterTable(table) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid master table"})
			return
		}
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

// validRoles is the fixed set of profile roles an admin may assign.
var validRoles = map[string]bool{
	"ADMIN": true,
	"STAFF": true,
}

// PUT /api/admin/users
func (h *Handler) UpdateUser(c *gin.Context) {
	var in updateUserInput
	if err := c.ShouldBindJSON(&in); err != nil || in.UserID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}
	if in.Role != nil && !validRoles[*in.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role tidak valid. Gunakan ADMIN atau STAFF"})
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
