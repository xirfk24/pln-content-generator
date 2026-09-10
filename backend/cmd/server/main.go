package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"pln-backend/internal/ai"
	"pln-backend/internal/auth"
	"pln-backend/internal/config"
	"pln-backend/internal/db"
	"pln-backend/internal/handlers"
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
		authed.POST("/contents/import", h.ImportContents)
		authed.GET("/contents/calendar", h.Calendar)
		authed.GET("/contents/:id", h.GetContent)
		authed.PUT("/contents/:id", h.UpdateContent)
		authed.DELETE("/contents/:id", h.DeleteContent)
		authed.GET("/contents/:id/details", h.ContentDetails)
		authed.POST("/contents/:id/workflow", h.WorkflowAction)

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

		authed.POST("/ai/generate-content", h.AIGenerateContent)
		authed.POST("/ai/improve-content", h.AIImproveContent)
		authed.POST("/ai/review-content", h.AIReviewContent)
		authed.POST("/ai/analyze-performance", h.AIAnalyzePerformance)
		authed.POST("/ai/recommendations", h.AIRecommendations)

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
