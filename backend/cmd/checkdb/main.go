package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"pln-backend/internal/db"
)

func main() {
	_ = godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	fmt.Println("Testing db.New with DATABASE_URL...")
	start := time.Now()
	pool, err := db.New(dbURL)
	if err != nil {
		fmt.Printf("db.New FAILED in %v: %v\n", time.Since(start), err)
	} else {
		fmt.Printf("db.New SUCCEEDED in %v!\n", time.Since(start))
		pool.Close()
	}
}

func testConn(connStr string, label string) {
	fmt.Printf("\n--- Testing: %s ---\n", label)
	ctx, cancel := context.WithTimeout(context.Background(), 7*time.Second)
	defer cancel()

	start := time.Now()
	cfg, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		fmt.Printf("ParseConfig error: %v\n", err)
		return
	}

	// Also try single pgx.Connect to get raw conn error
	rawConn, err := pgx.Connect(ctx, connStr)
	elapsed := time.Since(start)
	if err != nil {
		fmt.Printf("pgx.Connect failed (%v): %v\n", elapsed, err)
	} else {
		fmt.Printf("pgx.Connect SUCCEEDED in %v!\n", elapsed)
		_ = rawConn.Close(ctx)
		return
	}

	start = time.Now()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		fmt.Printf("pgxpool.NewWithConfig error (%v): %v\n", time.Since(start), err)
		return
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		fmt.Printf("pool.Ping error (%v): %v\n", time.Since(start), err)
	} else {
		fmt.Printf("pool.Ping SUCCEEDED in %v!\n", time.Since(start))
	}
}
