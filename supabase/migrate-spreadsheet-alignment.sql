-- ============================================================
-- SPREADSHEET ALIGNMENT MIGRATION
-- Samain struktur project dengan "1. REKAP MEDSOS 2026.xlsx"
--
-- Run ONCE in Supabase SQL Editor (after schema.sql + seed.sql).
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1) PILLARS (26 coded A-Z) — dari sheet TEMPLATE col KODE/TOPIK
-- ============================================================
INSERT INTO pillars (id, name, description) VALUES
  ('aaaa0000-0000-4000-8000-000000000000', 'A - Bencana & Pemulihan', 'Penanganan bencana dan pemulihan pasca bencana'),
  ('aaaa0000-0000-4000-8000-000000000001', 'B - TJSL', 'Tanggung Jawab Sosial dan Lingkungan'),
  ('aaaa0000-0000-4000-8000-000000000002', 'C - EV/SPKLU', 'Kendaraan listrik dan Stasiun Pengisian Kendaraan Listrik Umum'),
  ('aaaa0000-0000-4000-8000-000000000003', 'D - Energi Baru Terbarukan/REC', 'Energi baru terbarukan dan Renewable Energy Certificate'),
  ('aaaa0000-0000-4000-8000-000000000004', 'E - Jabar Smile', 'Program Jabar Smile'),
  ('aaaa0000-0000-4000-8000-000000000005', 'F - Instalasi Listrik', 'Instalasi dan pemasangan listrik'),
  ('aaaa0000-0000-4000-8000-000000000006', 'G - K3L', 'Keselamatan, Kesehatan Kerja dan Lingkungan'),
  ('aaaa0000-0000-4000-8000-000000000007', 'H - Kerja Sama', 'Kerja sama dan kemitraan'),
  ('aaaa0000-0000-4000-8000-000000000008', 'I - Electrifying Lifestyle', 'Gaya hidup elektrifikasi'),
  ('aaaa0000-0000-4000-8000-000000000009', 'J - Lisdes/Elektrifikasi', 'Listrik desa dan elektrifikasi daerah'),
  ('aaaa0000-0000-4000-8000-000000000010', 'K - Pasang Baru/Tambah Daya', 'Layanan pasang baru dan penambahan daya'),
  ('aaaa0000-0000-4000-8000-000000000011', 'L - Pembangkit', 'Pembangkit listrik'),
  ('aaaa0000-0000-4000-8000-000000000012', 'M - Keandalan/Siaga Kelistrikan', 'Keandalan sistem dan kesiapsiagaan kelistrikan'),
  ('aaaa0000-0000-4000-8000-000000000013', 'N - Penghargaan', 'Penghargaan dan prestasi'),
  ('aaaa0000-0000-4000-8000-000000000014', 'O - Pengumuman/Transformasi/HSH', 'Pengumuman, transformasi dan Human Capital Sharing'),
  ('aaaa0000-0000-4000-8000-000000000015', 'P - Penjualan/Konsumsi Listrik', 'Penjualan dan konsumsi listrik'),
  ('aaaa0000-0000-4000-8000-000000000016', 'Q - Penokohan', 'Penokohan figur dan pegawai'),
  ('aaaa0000-0000-4000-8000-000000000017', 'R - PLN Mobile', 'Aplikasi PLN Mobile'),
  ('aaaa0000-0000-4000-8000-000000000018', 'S - Promo PLN', 'Promosi dan program PLN'),
  ('aaaa0000-0000-4000-8000-000000000019', 'T - Rekening/Tagihan Listrik', 'Rekening dan tagihan listrik'),
  ('aaaa0000-0000-4000-8000-000000000020', 'U - Subsidi Listrik', 'Subsidi listrik'),
  ('aaaa0000-0000-4000-8000-000000000021', 'V - Surat Pembaca', 'Surat pembaca dan tanggapan publik'),
  ('aaaa0000-0000-4000-8000-000000000022', 'W - Tarif Tenaga Listrik', 'Tarif tenaga listrik'),
  ('aaaa0000-0000-4000-8000-000000000023', 'X - Tingkat Mutu Pelayanan', 'Tingkat mutu pelayanan pelanggan'),
  ('aaaa0000-0000-4000-8000-000000000024', 'Y - YBM', 'Yayasan Baitul Mal'),
  ('aaaa0000-0000-4000-8000-000000000025', 'Z - Lain-Lain', 'Topik lain-lain')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2) CATEGORIES — dari sheet "Kategori" col 4
--    Konten UID, Repost PLN ID, Repost PLN Mobile, Repost UP3
-- ============================================================
INSERT INTO categories (id, name, description) VALUES
  ('bbbb0000-0000-4000-8000-000000000001', 'Konten UID', 'Konten yang dibuat oleh tim UID Jawa Barat'),
  ('bbbb0000-0000-4000-8000-000000000002', 'Repost PLN ID', 'Repost konten dari akun pusat PLN'),
  ('bbbb0000-0000-4000-8000-000000000003', 'Repost PLN Mobile', 'Repost konten dari PLN Mobile'),
  ('bbbb0000-0000-4000-8000-000000000004', 'Repost UP3', 'Repost konten dari UP3'),
  ('bbbb0000-0000-4000-8000-000000000005', 'Repost Kementrian', 'Repost konten dari Kementrian')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3) PLATFORMS — tambahan YouTube
-- ============================================================
INSERT INTO platforms (id, name, icon) VALUES
  ('cccc0000-0000-4000-8000-000000000005', 'YouTube', 'youtube')
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;

-- ============================================================
-- 4) CONTENT FORMATS — dari spreadsheet col 9
--    Vid/Reels/Shorts, Feed/Photo, Carousel
--    (Tidak perlu table, ini nilai enum di app layer)
-- ============================================================
-- Catatan: update src/constants/index.ts CONTENT_FORMATS jadi:
-- ['Vid/Reels/Shorts', 'Feed/Photo', 'Carousel', 'Story', 'Article', 'Infographic']

-- ============================================================
-- 5) NEW COLUMNS on contents
--    Spreadsheet: Day, Reference, Content Brief (link)
-- ============================================================
ALTER TABLE contents ADD COLUMN IF NOT EXISTS day VARCHAR(10);
ALTER TABLE contents ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS brief_link TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS result_link TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_pillar_code VARCHAR(5);

-- Index untuk kolom baru
CREATE INDEX IF NOT EXISTS idx_contents_day ON contents(day);
CREATE INDEX IF NOT EXISTS idx_contents_content_pillar_code ON contents(content_pillar_code);

-- ============================================================
-- 6) NEW COLUMNS on publications
--    Spreadsheet: Result Link, Published Link
--    (publications udah punya url, tapi tambah result_link untuk Canva/drive)
-- ============================================================
ALTER TABLE publications ADD COLUMN IF NOT EXISTS result_link TEXT;

-- ============================================================
-- 7) RE-MAP old seeded content ke coded pillars (A-Z)
--    Old generic pillar -> coded pillar
-- ============================================================
-- Hapus constraint lama dulu (jika ada)
DO $$
BEGIN
  -- Re-map contents
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000006' WHERE pillar_id = '11111111-1111-1111-1111-111111111001';
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000023' WHERE pillar_id = '11111111-1111-1111-1111-111111111002';
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000016' WHERE pillar_id = '11111111-1111-1111-1111-111111111003';
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000018' WHERE pillar_id = '11111111-1111-1111-1111-111111111004';
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000015' WHERE pillar_id = '11111111-1111-1111-1111-111111111005';
  UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000001' WHERE pillar_id = '11111111-1111-1111-1111-111111111006';

  -- Re-map content_ideas
  UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000015' WHERE pillar_id = '11111111-1111-1111-1111-111111111005';
  UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000006' WHERE pillar_id = '11111111-1111-1111-1111-111111111001';
  UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000018' WHERE pillar_id = '11111111-1111-1111-1111-111111111004';
  UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000023' WHERE pillar_id = '11111111-1111-1111-1111-111111111002';
  UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000001' WHERE pillar_id = '11111111-1111-1111-1111-111111111006';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Re-map skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 8) POPULATE day dari planned_date
--    Spreadsheet col 2: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
-- ============================================================
UPDATE contents
SET day = CASE EXTRACT(DOW FROM planned_date)
  WHEN 0 THEN 'Minggu'
  WHEN 1 THEN 'Senin'
  WHEN 2 THEN 'Selasa'
  WHEN 3 THEN 'Rabu'
  WHEN 4 THEN 'Kamis'
  WHEN 5 THEN 'Jumat'
  WHEN 6 THEN 'Sabtu'
END
WHERE planned_date IS NOT NULL AND day IS NULL;

-- ============================================================
-- 9) POPULATE content_pillar_code dari pillar_id
--    Mapping pillar UUID -> kode A-Z
-- ============================================================
UPDATE contents SET content_pillar_code = 'A' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000000' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'B' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000001' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'C' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000002' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'D' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000003' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'E' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000004' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'F' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000005' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'G' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000006' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'H' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000007' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'I' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000008' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'J' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000009' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'K' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000010' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'L' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000011' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'M' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000012' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'N' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000013' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'O' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000014' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'P' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000015' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'Q' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000016' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'R' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000017' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'S' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000018' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'T' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000019' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'U' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000020' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'V' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000021' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'W' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000022' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'X' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000023' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'Y' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000024' AND content_pillar_code IS NULL;
UPDATE contents SET content_pillar_code = 'Z' WHERE pillar_id = 'aaaa0000-0000-4000-8000-000000000025' AND content_pillar_code IS NULL;

-- ============================================================
-- 10) UPDATE CONTENT_FORMATS di app layer
--     Spreadsheet pakai: Vid/Reels/Shorts, Feed/Photo, Carousel
--     (Bukan Short Video, Image Post, dst)
--     File: src/constants/index.ts — update manual setelah migration
-- ============================================================

-- ============================================================
-- 11) VERIFY — cek hasil migration
-- ============================================================
-- Total pillars (harus 26 coded + lama)
SELECT 'Pillars' AS check_name, COUNT(*) AS total FROM pillars
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Platform YouTube', COUNT(*) FROM platforms WHERE name = 'YouTube'
UNION ALL
SELECT 'Contents dengan day', COUNT(*) FROM contents WHERE day IS NOT NULL
UNION ALL
SELECT 'Contents dengan pillar_code', COUNT(*) FROM contents WHERE content_pillar_code IS NOT NULL;
