// Package middleware provides small HTTP middlewares: in-memory rate
// limiting (token bucket per key) and request body size limiting.
package middleware

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter is an in-memory token-bucket limiter keyed by an arbitrary
// string (client IP, user id, ...). It suits this single-instance backend;
// entries idle longer than maxIdle are pruned periodically so the map does
// not grow unbounded.
type RateLimiter struct {
	mu         sync.Mutex
	entries    map[string]*limiterEntry
	rate       rate.Limit
	burst      int
	retryAfter int // seconds advertised in Retry-After when limited
}

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

const (
	janitorInterval = 5 * time.Minute
	maxIdle         = 15 * time.Minute
)

// NewRateLimiter allows sustained `r` events per second with a burst bucket.
// Example: rate.Every(6*time.Second), 10 → 10 immediate requests, then 1 per 6s.
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		entries: map[string]*limiterEntry{},
		rate:    r,
		burst:   burst,
	}
	if r > 0 {
		rl.retryAfter = int(math.Ceil(1 / float64(r)))
	} else {
		rl.retryAfter = 60
	}
	if rl.retryAfter < 1 {
		rl.retryAfter = 1
	}
	go rl.janitor()
	return rl
}

// Middleware aborts with 429 when the key's bucket is exhausted. Requests
// without a key (empty string) pass through unchecked.
func (rl *RateLimiter) Middleware(keyFn func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := keyFn(c)
		if key == "" {
			c.Next()
			return
		}
		if !rl.allow(key) {
			c.Header("Retry-After", itoa(rl.retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.",
			})
			return
		}
		c.Next()
	}
}

func (rl *RateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	e, ok := rl.entries[key]
	if !ok {
		e = &limiterEntry{limiter: rate.NewLimiter(rl.rate, rl.burst)}
		rl.entries[key] = e
	}
	e.lastSeen = time.Now()
	return e.limiter.Allow()
}

func (rl *RateLimiter) janitor() {
	ticker := time.NewTicker(janitorInterval)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		for key, e := range rl.entries {
			if time.Since(e.lastSeen) > maxIdle {
				delete(rl.entries, key)
			}
		}
		rl.mu.Unlock()
	}
}

// BodyLimit caps the request body to n bytes. Oversized bodies fail binding
// with a 4xx from the handler instead of buffering unbounded JSON in memory.
func BodyLimit(n int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, n)
		c.Next()
	}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

// SecurityHeaders sets baseline browser-security response headers. HSTS is
// only emitted when the request came in over TLS so dev (HTTP) is unaffected.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("X-XSS-Protection", "0") // modern browsers; rely on CSP instead
		if c.Request.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}
