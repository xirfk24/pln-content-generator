-- ============================================================
-- AUDIT ADJUSTMENTS MIGRATION
-- Penyesuaian Kolom & Struktur Berdasarkan Hasil Audit Humas PLN
-- ============================================================

-- 1. Tambah kolom multi-platform dan multi-purpose pada tabel contents
ALTER TABLE contents ADD COLUMN IF NOT EXISTS platform_ids TEXT[] DEFAULT '{}';
ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_purposes TEXT[] DEFAULT '{}';

-- 2. Tambah kolom modul Konten Tabungan pada tabel contents
ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_savings BOOLEAN DEFAULT FALSE;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_reason TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_month VARCHAR(10);
ALTER TABLE contents ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

-- 3. Tambah kolom alasan pembatalan pada tabel publications
ALTER TABLE publications ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 4. Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_contents_is_savings ON contents(is_savings);
CREATE INDEX IF NOT EXISTS idx_contents_savings_month ON contents(savings_month);

-- 5. Sinkronkan data lama (jika ada platform_id tunggal, masukkan ke platform_ids)
UPDATE contents 
SET platform_ids = ARRAY[platform_id::TEXT] 
WHERE platform_id IS NOT NULL AND (platform_ids IS NULL OR cardinality(platform_ids) = 0);

UPDATE contents 
SET content_purposes = ARRAY[content_purpose] 
WHERE content_purpose IS NOT NULL AND (content_purposes IS NULL OR cardinality(content_purposes) = 0);
