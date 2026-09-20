package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"

	"pln-backend/internal/ai"
	"pln-backend/internal/auth"
	"pln-backend/internal/config"
	"pln-backend/internal/db"
	"pln-backend/internal/handlers"
	"pln-backend/internal/middleware"
)

func main() {
	cfg := config.Load()

	pool, err := db.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer pool.Close()

	if cfg.SupabaseJWTSecret == "" {
		log.Println("WARNING: SUPABASE_JWT_SECRET not set — all authenticated routes will reject requests")
	}

	h := handlers.New(pool, cfg.SupabaseJWTSecret, ai.NewProvider(cfg.GeminiAPIKey))

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS
	r.Use(corsMiddleware(cfg.AllowedOrigins))

	// Security headers (nosniff, frame-deny, referrer policy, HSTS on TLS)
	r.Use(middleware.SecurityHeaders())

	// Request guards: cap body size (5 MB, enough for a 500-row import) and
	// rate-limit every route per client IP to blunt probing/abuse.
	r.Use(middleware.BodyLimit(5 << 20))
	ipKey := func(c *gin.Context) string { return c.ClientIP() }
	r.Use(middleware.NewRateLimiter(rate.Every(100*time.Millisecond), 50).Middleware(ipKey))

	// Health
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	verifier := auth.NewVerifier(pool, cfg.SupabaseURL, cfg.SupabaseJWTSecret)

	api := r.Group("/api")

	// Auth-aware endpoints
	authed := api.Group("", verifier.Middleware())
	{
		authed.POST("/auth/logout", h.Logout)
		authed.GET("/auth/me", h.Me)

		authed.GET("/contents", h.ListContents)
		authed.POST("/contents", h.CreateContent)
		authed.POST("/contents/import/validate", h.ValidateImportContents)
		authed.POST("/contents/import", h.ImportContents)
		authed.GET("/contents/calendar", h.Calendar)
		authed.GET("/contents/:id", h.GetContent)
		authed.PUT("/contents/:id", h.UpdateContent)
		authed.DELETE("/contents/:id", h.DeleteContent)
		authed.GET("/contents/:id/details", h.ContentDetails)
		authed.POST("/contents/:id/workflow", h.WorkflowAction)
		authed.POST("/contents/:id/move-to-tabungan", h.MoveToTabungan)

		// Konten Tabungan
		authed.GET("/tabungan", h.ListTabungan)
		authed.POST("/tabungan/:id/save", h.MoveToTabungan)
		authed.POST("/tabungan/:id/move-to-plan", h.MoveToPlan)
		authed.POST("/tabungan/:id/reschedule", h.RescheduleTabungan)

		authed.GET("/publications", h.ListPublications)
		authed.POST("/publications", h.CreatePublication)
		authed.PUT("/publications/:id", h.UpdatePublication)
		authed.DELETE("/publications/:id", h.DeletePublication)
		authed.GET("/publications/:id/metrics", h.ListMetrics)
		authed.POST("/publications/:id/metrics", h.UpsertMetric)

		authed.GET("/analytics", h.Analytics)
		authed.GET("/analytics/topic-recap", h.TopicRecap)
		authed.GET("/dashboard", h.Dashboard)
		authed.GET("/reports", h.Reports)
		authed.GET("/recap/years", h.RecapYears)
		authed.GET("/recap", h.Recap)
		authed.GET("/master-data", h.MasterData)

		authed.GET("/workflow/approval-queue", h.ApprovalQueue)
		authed.GET("/workflow/tasks", h.MyTasks)

		authed.GET("/planning-periods", h.ListPlanningPeriods)
		authed.GET("/planning-periods/:id", h.GetPlanningPeriod)
		authed.POST("/planning-periods", h.CreatePlanningPeriod)
		authed.PUT("/planning-periods/:id", h.UpdatePlanningPeriod)
		authed.DELETE("/planning-periods/:id", h.DeletePlanningPeriod)
		authed.POST("/planning-periods/:id/activate", h.ActivatePlanningPeriod)
		authed.POST("/planning-periods/:id/archive", h.ArchivePlanningPeriod)

		// AI endpoints hit the paid Gemini API, so they get a strict
		// per-user quota on top of the global per-IP limit: 10 requests
		// immediately, then 1 every 6 seconds per user.
		userKey := func(c *gin.Context) string {
			if u := auth.FromContext(c); u != nil {
				return u.ID
			}
			return ""
		}
		aiGroup := authed.Group("/ai", middleware.NewRateLimiter(rate.Every(6*time.Second), 10).Middleware(userKey))
		{
			aiGroup.POST("/generate-content", h.AIGenerateContent)
			aiGroup.POST("/improve-content", h.AIImproveContent)
			aiGroup.POST("/review-content", h.AIReviewContent)
			aiGroup.POST("/analyze-performance", h.AIAnalyzePerformance)
			aiGroup.POST("/recommendations", h.AIRecommendations)
		}

		admin := authed.Group("/admin", auth.RequireRole("ADMIN"))
		{
			admin.GET("/categories", h.ListMaster("categories", false))
			admin.POST("/categories", h.CreateMaster("categories", false))
			admin.PUT("/categories/:id", h.UpdateMaster("categories", false))
			admin.DELETE("/categories/:id", h.DeleteMaster("categories"))

			admin.GET("/pillars", h.ListMaster("pillars", false))
			admin.POST("/pillars", h.CreateMaster("pillars", false))
			admin.PUT("/pillars/:id", h.UpdateMaster("pillars", false))
			admin.DELETE("/pillars/:id", h.DeleteMaster("pillars"))

			admin.GET("/platforms", h.ListMaster("platforms", true))
			admin.POST("/platforms", h.CreateMaster("platforms", true))
			admin.PUT("/platforms/:id", h.UpdateMaster("platforms", true))
			admin.DELETE("/platforms/:id", h.DeleteMaster("platforms"))

			admin.GET("/users", h.ListUsers)
			admin.PUT("/users", h.UpdateUser)
		}
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
	log.Printf("backend listening on :%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(origins []string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, o := range origins {
		allowed[strings.TrimSpace(o)] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
