-- ============================================================================
-- MIGRATION: REMOVE 'PLANNED' FROM CONTENT STATUS AND MIGRATE TO 'DRAFT'
-- ============================================================================

-- 1. Migrasi seluruh konten lama yang berstatus 'PLANNED' menjadi 'DRAFT'
UPDATE contents 
SET status = 'DRAFT', updated_at = NOW() 
WHERE status = 'PLANNED';

-- 2. Hapus constraint lama dan buat constraint baru tanpa status 'PLANNED'
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_status_check;

ALTER TABLE contents ADD CONSTRAINT contents_status_check CHECK (
  status IN (
    'DRAFT',
    'IN_PROGRESS',
    'PENDING_REVIEW',
    'REVISION_REQUIRED',
    'APPROVED',
    'READY_TO_PUBLISH',
    'PUBLISHED',
    'RESCHEDULED',
    'NOT_REALIZED'
  )
);

-- 3. Catat riwayat migrasi pada approval_histories untuk audit trail jika diperlukan
INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_at)
SELECT id, 'STATUS_MIGRATED', 'PLANNED', 'DRAFT', 'Migrasi status otomatis: Direncanakan (PLANNED) digantikan menjadi Draft (DRAFT)', NOW()
FROM contents
WHERE status = 'DRAFT' AND created_at < NOW() - INTERVAL '1 minute'
ON CONFLICT DO NOTHING;
