package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func New(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	// Kill queries that run longer than 30s so a single slow/hung query
	// cannot exhaust the 10-connection pool and take down the whole API.
	// Supersedes the per-call context.WithTimeout that h.ctx() could not
	// provide cleanly (canceler leak); this is the pgx-native way to bound
	// every query uniformly.
	cfg.HealthCheckPeriod = time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}

	// Auto-apply required schema migrations idempotently
	runMigrations(ctx, pool)

	return pool, nil
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) {
	queries := []string{
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS platform_ids TEXT[] DEFAULT '{}'`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_purposes TEXT[] DEFAULT '{}'`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_savings BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_reason TEXT`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_month VARCHAR(10)`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ`,
		`ALTER TABLE publications ADD COLUMN IF NOT EXISTS cancel_reason TEXT`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS production_link TEXT`,
		`ALTER TABLE approval_histories DROP CONSTRAINT IF EXISTS approval_histories_action_check`,
		`UPDATE publications p SET planned_publish_date = c.planned_date::DATE FROM contents c WHERE p.content_id = c.id AND c.planned_date IS NOT NULL AND p.status != 'PUBLISHED'`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_purpose_check`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_posting_category_check`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_format_check`,
		`CREATE INDEX IF NOT EXISTS idx_contents_is_savings ON contents(is_savings)`,
		`CREATE INDEX IF NOT EXISTS idx_contents_savings_month ON contents(savings_month)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_pillars_name ON pillars(name)`,

		// Seed standard Content Pillars
		`INSERT INTO pillars (name, description) VALUES
			('Edukasi (Educational)', 'Konten edukasi, tips, dan pemahaman teknis kelistrikan'),
			('Hiburan (Entertainment)', 'Konten hiburan, humor, meme, dan gaya hidup santai'),
			('Inspirasi (Inspirational)', 'Konten inspirasi, kisah human interest, dan tokoh inspiratif'),
			('Interaksi & Komunitas (Engagement)', 'Konten tanya-jawab, kuis, polling, dan interaksi audiens'),
			('Promosi / Penjualan (Promotional)', 'Promosi program tambah daya, pasang baru, dan promo PLN Mobile'),
			('Di Balik Layar (Behind the Scenes)', 'Dokumentasi lapangan yantek dan operasional di balik layar'),
			('Bukti Sosial & Ulasan (Social Proof / Testimonials)', 'Ulasan pelanggan, testimoni, apresiasi, dan penghargaan'),
			('Tren & Relevansi Terkini (Trending / Relatable)', 'Topik tren media sosial yang dikaitkan dengan kelistrikan'),
			('Berita & Wawasan Industri (Industry News & Insights)', 'Berita transisi energi, EBT, kebijakan industri, dan korporat'),
			('Solusi Masalah & FAQ (Problem Solving / Help)', 'Panduan penyelesaian kendala, FAQ kelistrikan, dan kanal pengaduan')
		ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,

		// Seed standard official Platforms
		`INSERT INTO platforms (name, icon) VALUES
			('Instagram', 'instagram'),
			('Facebook', 'facebook'),
			('TikTok', 'tiktok'),
			('YouTube', 'youtube'),
			('LinkedIn', 'linkedin'),
			('Website', 'website'),
			('Twitter/X', 'twitter')
		ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon`,
	}
	for _, q := range queries {
		if _, err := pool.Exec(ctx, q); err != nil {
			// Schema migrations are idempotent (IF NOT EXISTS / ON CONFLICT),
			// so a failure here means something is genuinely wrong — log it
			// instead of swallowing silently so the operator can see it.
			log.Printf("migration warning: %v (query: %s)", err, truncate(q, 80))
		}
	}
}

// truncate shortens a string to max chars for compact logging.
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
