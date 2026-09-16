package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"pln-backend/internal/ai"
	"pln-backend/internal/auth"
	"pln-backend/internal/models"
)

type Handler struct {
	Pool      *pgxpool.Pool
	JWTSecret string
	AI        ai.Provider
}

func New(pool *pgxpool.Pool, jwtSecret string, aiProvider ai.Provider) *Handler {
	return &Handler{Pool: pool, JWTSecret: jwtSecret, AI: aiProvider}
}

// GET /api/auth/me
func (h *Handler) Me(c *gin.Context) {
	user := auth.FromContext(c)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"user": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": gin.H{
		"id":      user.ID,
		"email":   user.Email,
		"profile": user,
	}})
}

// POST /api/auth/logout
//
// NOTE: This backend uses stateless JWT (Supabase access tokens). Logout is
// client-side only (discard the token); the token remains technically valid
// until it expires. For full revocation, implement a server-side denylist
// (e.g. a Redis set of revoked jti/sub values checked in the auth middleware)
// or use Supabase's session revocation API. This is an accepted trade-off
// for this app's current threat model; document it if the model changes.
func (h *Handler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// requireUser returns the authenticated profile or writes 401.
func requireUser(c *gin.Context) *models.Profile {
	user := auth.FromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return nil
	}
	if user.Role == "" {
		user.Role = "STAFF"
	}
	return user
}
