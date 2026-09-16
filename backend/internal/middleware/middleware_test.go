package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupRouter(rl *RateLimiter, keyFn func(*gin.Context) string) *gin.Engine {
	r := gin.New()
	r.Use(rl.Middleware(keyFn))
	r.POST("/ping", func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func doRequest(r *gin.Engine) int {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/ping", nil)
	r.ServeHTTP(w, req)
	return w.Code
}

func TestRateLimiter_BlocksAfterBurst(t *testing.T) {
	// 3 req/s sustained, burst 2.
	rl := NewRateLimiter(rate.Every(333*time.Millisecond), 2)
	r := setupRouter(rl, func(c *gin.Context) string { return "1.2.3.4" })

	if got := doRequest(r); got != http.StatusOK {
		t.Errorf("req 1 = %d, want 200", got)
	}
	if got := doRequest(r); got != http.StatusOK {
		t.Errorf("req 2 = %d, want 200", got)
	}
	if got := doRequest(r); got != http.StatusTooManyRequests {
		t.Errorf("req 3 = %d, want 429", got)
	}
	if got := doRequest(r); got != http.StatusTooManyRequests {
		t.Errorf("req 4 = %d, want 429", got)
	}
}

func TestRateLimiter_KeysAreIndependent(t *testing.T) {
	rl := NewRateLimiter(rate.Every(time.Minute), 1)
	r := setupRouter(rl, func(c *gin.Context) string { return c.Query("u") })

	for _, u := range []string{"a", "b", "c"} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/ping?u="+u, nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("user %s first request = %d, want 200", u, w.Code)
		}
	}

	// User "a" exhausted; "d" is untouched.
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/ping?u=a", nil))
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("user a second request = %d, want 429", w.Code)
	}
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/ping?u=d", nil))
	if w.Code != http.StatusOK {
		t.Errorf("user d first request = %d, want 200", w.Code)
	}
}

func TestRateLimiter_EmptyKeySkipsLimit(t *testing.T) {
	rl := NewRateLimiter(rate.Every(time.Minute), 1)
	r := setupRouter(rl, func(c *gin.Context) string { return "" })

	for i := 0; i < 10; i++ {
		if got := doRequest(r); got != http.StatusOK {
			t.Errorf("req %d = %d, want 200 (empty key must not be limited)", i+1, got)
		}
	}
}

func TestRateLimiter_429HasRetryAfter(t *testing.T) {
	rl := NewRateLimiter(rate.Every(6*time.Second), 1)
	r := setupRouter(rl, func(c *gin.Context) string { return "u" })

	doRequest(r) // exhaust burst
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/ping", nil))

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("code = %d, want 429", w.Code)
	}
	if ra := w.Header().Get("Retry-After"); ra == "" {
		t.Error("Retry-After header missing on 429")
	}
	if !strings.Contains(w.Body.String(), "Terlalu banyak") {
		t.Errorf("429 body = %q, want Indonesian message", w.Body.String())
	}
}

func TestBodyLimit_RejectsOversized(t *testing.T) {
	r := gin.New()
	r.Use(BodyLimit(16))
	r.POST("/echo", func(c *gin.Context) {
		if _, err := io.ReadAll(c.Request.Body); err != nil {
			c.Status(http.StatusRequestEntityTooLarge)
			return
		}
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/echo", strings.NewReader("kecil")))
	if w.Code != http.StatusOK {
		t.Errorf("small body = %d, want 200", w.Code)
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/echo",
		strings.NewReader("ini jauh lebih panjang dari 16 byte")))
	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("oversized body = %d, want 413", w.Code)
	}
}
