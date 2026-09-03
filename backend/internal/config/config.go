package config

import (
	"os"
	"strings"
)

type Config struct {
	Port             string
	DatabaseURL      string
	SupabaseURL      string
	SupabaseJWTSecret string
	AllowedOrigins   []string
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       mustEnv("DATABASE_URL"),
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
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
		panic("missing required env: " + key)
	}
	return v
}
