-- =========================================================
-- MIGRASI WORKFLOW STATUS KONTEN V2
-- =========================================================

-- 1. Tambah kolom production_link
ALTER TABLE contents ADD COLUMN IF NOT EXISTS production_link TEXT;

-- 2. Drop constraint lama terlebih dahulu
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_status_check;
ALTER TABLE approval_histories DROP CONSTRAINT IF EXISTS approval_histories_action_check;

-- 3. Migrasi data status lama ke status baru DAHULU (sebelum constraint baru dipasang)
UPDATE contents
SET status = 'PRODUCTION'
WHERE status IN ('IN_PROGRESS', 'REVISION_REQUIRED');

-- Pengaman: Jika ada baris dengan status di luar skema v2, ubah ke DRAFT agar constraint tidak error
UPDATE contents
SET status = 'DRAFT'
WHERE status NOT IN (
  'DRAFT','PENDING_REVIEW','APPROVED',
  'PRODUCTION','PENDING_PRODUCTION_REVIEW',
  'READY_TO_PUBLISH','PUBLISHED',
  'REJECTED','RESCHEDULED','NOT_REALIZED'
);

-- 4. Pasang constraint status baru pada tabel contents
ALTER TABLE contents ADD CONSTRAINT contents_status_check CHECK (
  status IN (
    'DRAFT','PENDING_REVIEW','APPROVED',
    'PRODUCTION','PENDING_PRODUCTION_REVIEW',
    'READY_TO_PUBLISH','PUBLISHED',
    'REJECTED','RESCHEDULED','NOT_REALIZED'
  )
);

-- 5. Pasang constraint action baru pada tabel approval_histories
ALTER TABLE approval_histories ADD CONSTRAINT approval_histories_action_check CHECK (
  action IN (
    'CREATED','SUBMITTED','REVIEWED','REVISION_REQUESTED','REVIEW_APPROVED',
    'FINAL_APPROVED','RESUBMITTED',
    'APPROVED','CONCEPT_REVISION_REQUESTED','SHORTCUT_READY',
    'START_PRODUCTION','PRODUCTION_SUBMITTED','PRODUCTION_APPROVED',
    'PRODUCTION_REVISION_REQUESTED','REVISION_FROM_READY',
    'REJECTED','MARK_PUBLISHED','STATUS_MIGRATED'
  )
);

-- 6. Catat riwayat migrasi status untuk audit trail
INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
SELECT id, 'STATUS_MIGRATED', 'IN_PROGRESS', 'PRODUCTION', 'Status otomatis disesuaikan ke PRODUCTION (migrasi workflow v2)', created_by
FROM contents
WHERE status = 'PRODUCTION'
  AND id NOT IN (SELECT content_id FROM approval_histories WHERE action = 'STATUS_MIGRATED');
