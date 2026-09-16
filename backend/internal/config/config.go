package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	SupabaseURL       string
	SupabaseJWTSecret string
	GeminiAPIKey      string
	AllowedOrigins    []string
}

// Load reads configuration from environment / .env files.
//
// SECURITY NOTE: DATABASE_URL typically uses the `postgres` superuser role.
// For production, create a dedicated least-privilege role (GRANT only
// SELECT/INSERT/UPDATE/DELETE on the app tables, REVOKE everything else)
// and use that in DATABASE_URL so a SQL injection cannot DROP tables or
// read auth.users / auth.refresh_tokens.
func Load() *Config {
	// Load .env next to the working dir (backend/.env); ignore if missing.
	for _, p := range []string{".env", "../.env"} {
		if _, err := os.Stat(p); err == nil {
			_ = godotenv.Overload(p)
			break
		}
	}

	return &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       mustEnv("DATABASE_URL"),
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		GeminiAPIKey:      getEnv("GEMINI_API_KEY", ""),
		AllowedOrigins:    strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3001,http://localhost:5173"), ","),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env: " + key + " (set it in backend/.env — see .env.example)")
	}
	return v
}
