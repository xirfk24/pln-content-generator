package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pln-backend/internal/models"
)

type ctxKey string

const userKey ctxKey = "user"

// Middleware verifies Supabase access token (Bearer) and loads the profile.
// Sets user in context. On invalid/missing token aborts with 401.
func Middleware(pool *pgxpool.Pool, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := resolveUser(c, pool, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.Set(string(userKey), user)
		c.Next()
	}
}

// OptionalMiddleware attaches the user when a valid token is present,
// but lets anonymous requests through (matches old RLS-permissive routes).
func OptionalMiddleware(pool *pgxpool.Pool, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, _ := resolveUser(c, pool, jwtSecret)
		if user != nil {
			c.Set(string(userKey), user)
		}
		c.Next()
	}
}

func FromContext(c *gin.Context) *models.Profile {
	v, ok := c.Get(string(userKey))
	if !ok {
		return nil
	}
	p, _ := v.(*models.Profile)
	return p
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := FromContext(c)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		if user.Role == "" {
			user.Role = "STAFF"
		}
		for _, r := range roles {
			if user.Role == r {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	}
}

func resolveUser(c *gin.Context, pool *pgxpool.Pool, jwtSecret string) (*models.Profile, error) {
	header := c.GetHeader("Authorization")
	if header == "" || !strings.HasPrefix(header, "Bearer ") {
		return nil, nil
	}
	tokenStr := strings.TrimPrefix(header, "Bearer ")

	userID, err := verifyToken(tokenStr, jwtSecret)
	if err != nil {
		return nil, err
	}
	return loadProfile(c.Request.Context(), pool, userID)
}

func verifyToken(tokenStr, jwtSecret string) (string, error) {
	if jwtSecret == "" {
		return "", errors.New("SUPABASE_JWT_SECRET not configured")
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(jwtSecret), nil
	}, jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", errors.New("missing sub claim")
	}
	return sub, nil
}

func loadProfile(ctx context.Context, pool *pgxpool.Pool, userID string) (*models.Profile, error) {
	p := &models.Profile{}
	err := pool.QueryRow(ctx, `
		SELECT p.id, p.email, p.full_name, p.role, p.is_active, p.created_at, p.updated_at
		FROM profiles p WHERE p.id = $1
	`, userID).Scan(&p.ID, &p.Email, &p.FullName, &p.Role, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}
