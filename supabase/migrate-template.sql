-- ============================================================
-- TEMPLATE ALIGNMENT MIGRATION — Content Plan PLN UID Jawa Barat 2026
-- Aligns pillars to the 26 coded topics (A-Z) and adds
-- `day` + `reference` columns to contents.
--
-- Run ONCE in Supabase SQL Editor (after schema.sql + seed.sql).
-- IDEMPOTENT-ish: safe to re-run (upserts + IF NOT EXISTS).
-- ============================================================

-- 1) New coded pillars (A-Z) per official template ------------------
INSERT INTO pillars (id, name, description) VALUES
  ('aaaa0000-0000-4000-8000-000000000000', 'A - Bencana & Pemulihan',      'Penanganan bencana dan pemulihan pasca bencana'),
  ('aaaa0000-0000-4000-8000-000000000001', 'B - TJSL',                     'Tanggung Jawab Sosial dan Lingkungan'),
  ('aaaa0000-0000-4000-8000-000000000002', 'C - EV/SPKLU',                 'Kendaraan listrik dan Stasiun Pengisian Kendaraan Listrik Umum'),
  ('aaaa0000-0000-4000-8000-000000000003', 'D - Energi Baru Terbarukan/REC','Energi baru terbarukan dan Renewable Energy Certificate'),
  ('aaaa0000-0000-4000-8000-000000000004', 'E - Jabar Smile',              'Program Jabar Smile'),
  ('aaaa0000-0000-4000-8000-000000000005', 'F - Instalasi Listrik',        'Instalasi dan pemasangan listrik'),
  ('aaaa0000-0000-4000-8000-000000000006', 'G - K3L',                      'Keselamatan, Kesehatan Kerja dan Lingkungan'),
  ('aaaa0000-0000-4000-8000-000000000007', 'H - Kerja Sama',               'Kerja sama dan kemitraan'),
  ('aaaa0000-0000-4000-8000-000000000008', 'I - Electrifying Lifestyle',   'Gaya hidup elektrifikasi'),
  ('aaaa0000-0000-4000-8000-000000000009', 'J - Lisdes/Elektrifikasi',     'Listrik desa dan elektrifikasi daerah'),
  ('aaaa0000-0000-4000-8000-000000000010', 'K - Pasang Baru/Tambah Daya',  'Layanan pasang baru dan penambahan daya'),
  ('aaaa0000-0000-4000-8000-000000000011', 'L - Pembangkit',               'Pembangkit listrik'),
  ('aaaa0000-0000-4000-8000-000000000012', 'M - Keandalan/Siaga Kelistrikan','Keandalan sistem dan kesiapsiagaan kelistrikan'),
  ('aaaa0000-0000-4000-8000-000000000013', 'N - Penghargaan',              'Penghargaan dan prestasi'),
  ('aaaa0000-0000-4000-8000-000000000014', 'O - Pengumuman/Transformasi/HSH','Pengumuman, transformasi dan Human Capital Sharing'),
  ('aaaa0000-0000-4000-8000-000000000015', 'P - Penjualan/Konsumsi Listrik','Penjualan dan konsumsi listrik'),
  ('aaaa0000-0000-4000-8000-000000000016', 'Q - Penokohan',                'Penokohan figur dan pegawai'),
  ('aaaa0000-0000-4000-8000-000000000017', 'R - PLN Mobile',               'Aplikasi PLN Mobile'),
  ('aaaa0000-0000-4000-8000-000000000018', 'S - Promo PLN',                'Promosi dan program PLN'),
  ('aaaa0000-0000-4000-8000-000000000019', 'T - Rekening/Tagihan Listrik', 'Rekening dan tagihan listrik'),
  ('aaaa0000-0000-4000-8000-000000000020', 'U - Subsidi Listrik',          'Subsidi listrik'),
  ('aaaa0000-0000-4000-8000-000000000021', 'V - Surat Pembaca',            'Surat pembaca dan tanggapan publik'),
  ('aaaa0000-0000-4000-8000-000000000022', 'W - Tarif Tenaga Listrik',     'Tarif tenaga listrik'),
  ('aaaa0000-0000-4000-8000-000000000023', 'X - Tingkat Mutu Pelayanan',   'Tingkat mutu pelayanan pelanggan'),
  ('aaaa0000-0000-4000-8000-000000000024', 'Y - YBM',                      'Yayasan Baitul Mal'),
  ('aaaa0000-0000-4000-8000-000000000025', 'Z - Lain-Lain',                'Topik lain-lain')
ON CONFLICT (id) DO NOTHING;

-- 2) New columns on contents ----------------------------------------
ALTER TABLE contents ADD COLUMN IF NOT EXISTS day VARCHAR(10);
ALTER TABLE contents ADD COLUMN IF NOT EXISTS reference TEXT;

-- 3) Re-map existing seeded content to coded pillars ----------------
-- Old generic pillar -> closest coded pillar
UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000006' -- K3L
WHERE pillar_id = '11111111-1111-1111-1111-111111111001';               -- was: Keselamatan Listrik

UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000023' -- Tingkat Mutu Pelayanan
WHERE pillar_id = '11111111-1111-1111-1111-111111111002';               -- was: Informasi Layanan

UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000016' -- Penokohan
WHERE pillar_id = '11111111-1111-1111-1111-111111111003';               -- was: Kegiatan Perusahaan

UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000018' -- Promo PLN
WHERE pillar_id = '11111111-1111-1111-1111-111111111004';               -- was: Hari Besar Nasional

UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000015' -- Penjualan/Konsumsi Listrik
WHERE pillar_id = '11111111-1111-1111-1111-111111111005';               -- was: Tips Kelistrikan

UPDATE contents SET pillar_id = 'aaaa0000-0000-4000-8000-000000000001' -- TJSL
WHERE pillar_id = '11111111-1111-1111-1111-111111111006';               -- was: Program Sosial

UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000015'
WHERE pillar_id = '11111111-1111-1111-1111-111111111005';

UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000006'
WHERE pillar_id = '11111111-1111-1111-1111-111111111001';

UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000018'
WHERE pillar_id = '11111111-1111-1111-1111-111111111004';

UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000023'
WHERE pillar_id = '11111111-1111-1111-1111-111111111002';

UPDATE content_ideas SET pillar_id = 'aaaa0000-0000-4000-8000-000000000001'
WHERE pillar_id = '11111111-1111-1111-1111-111111111006';

-- 4) Populate `day` from planned_date --------------------------------
UPDATE contents
SET day = TRIM(TRAILING ',' FROM TO_CHAR(planned_date::timestamp, 'Day'))
WHERE planned_date IS NOT NULL AND (day IS NULL OR day = '');

-- 5) Optional: retire old generic pillars (keep rows for history,
--    but mark them; safe to skip deletion) ---------------------------
-- DELETE FROM pillars WHERE id IN (
--   '11111111-1111-1111-1111-111111111001','11111111-1111-1111-1111-111111111002',
--   '11111111-1111-1111-1111-111111111003','11111111-1111-1111-1111-111111111004',
--   '11111111-1111-1111-1111-111111111005','11111111-1111-1111-1111-111111111006'
-- );
