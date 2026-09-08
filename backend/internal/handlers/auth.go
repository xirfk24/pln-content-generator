package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
func (h *Handler) Logout(c *gin.Context) {
	// Stateless JWT: client discards tokens. Respond success for API compat.
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

func isTokenSubject(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) > 7 && header[:7] == "Bearer " {
		token, _, err := jwt.NewParser().ParseUnverified(header[7:], jwt.MapClaims{})
		if err == nil {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sub, ok := claims["sub"].(string); ok {
					return sub
				}
			}
		}
	}
	return ""
}
