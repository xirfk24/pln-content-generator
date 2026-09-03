package auth

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pln-backend/internal/models"
)

type ctxKey string

const userKey ctxKey = "user"

type Verifier struct {
	pool       *pgxpool.Pool
	jwtSecret  string       // legacy HS256 (optional)
	jwks       *jwksCache   // ES256 signing keys (current Supabase default)
}

func NewVerifier(pool *pgxpool.Pool, supabaseURL, jwtSecret string) *Verifier {
	v := &Verifier{pool: pool, jwtSecret: jwtSecret}
	if supabaseURL != "" {
		v.jwks = newJWKSCache(supabaseURL)
	}
	return v
}

// Middleware verifies the Supabase access token (Bearer) and loads the profile.
func (v *Verifier) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := v.resolve(c)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.Set(string(userKey), user)
		c.Next()
	}
}

// FromContext returns the authenticated profile, if any.
func FromContext(c *gin.Context) *models.Profile {
	val, ok := c.Get(string(userKey))
	if !ok {
		return nil
	}
	p, _ := val.(*models.Profile)
	return p
}

// RequireRole aborts unless the user's role is in the allowed set.
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

func (v *Verifier) resolve(c *gin.Context) *models.Profile {
	header := c.GetHeader("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return nil
	}
	tokenStr := strings.TrimPrefix(header, "Bearer ")

	userID, err := v.verifyToken(tokenStr)
	if err != nil {
		log.Printf("token verify failed: %v", err)
		return nil
	}

	p, err := loadProfile(c.Request.Context(), v.pool, userID)
	if err != nil {
		log.Printf("profile load failed for user %s: %v", userID, err)
		return nil
	}
	return p
}

// verifyToken supports both current ES256 signing keys (via JWKS) and the
// legacy HS256 JWT secret, so it works on old and new Supabase projects.
func (v *Verifier) verifyToken(tokenStr string) (string, error) {
	var kid, alg string
	unverified, _, err := jwt.NewParser().ParseUnverified(tokenStr, jwt.MapClaims{})
	if err == nil {
		if h, ok := unverified.Header["kid"].(string); ok {
			kid = h
		}
		if a, ok := unverified.Header["alg"].(string); ok {
			alg = a
		}
	}

	keyFunc := func(t *jwt.Token) (interface{}, error) {
		switch {
		case alg == "ES256" || t.Method.Alg() == "ES256":
			if v.jwks == nil {
				return nil, errors.New("ES256 token but SUPABASE_URL not configured")
			}
			if kid == "" {
				return nil, errors.New("ES256 token without kid header")
			}
			return v.jwks.get(kid)
		case alg == "HS256" || t.Method.Alg() == "HS256":
			if v.jwtSecret == "" {
				return nil, errors.New("HS256 token but SUPABASE_JWT_SECRET not configured")
			}
			return []byte(v.jwtSecret), nil
		default:
			return nil, errors.New("unsupported alg: " + alg)
		}
	}

	token, err := jwt.Parse(tokenStr, keyFunc,
		jwt.WithValidMethods([]string{"ES256", "HS256"}),
		jwt.WithExpirationRequired())
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
