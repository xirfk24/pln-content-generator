-- Migration: Add content_purpose & posting_category to contents
-- Date: 2026-09-09
-- UR-05: Topic, Content Purpose, dan Posting Category
--
-- content_purpose: Education, Entertainment, Inspirational, Promotion, Information
-- posting_category: Original, Repost PLN ID, Repost UP3, Campaign, Other

ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_purpose VARCHAR(30);
ALTER TABLE contents ADD COLUMN IF NOT EXISTS posting_category VARCHAR(30);

-- Optional: add CHECK constraints for data integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'contents_content_purpose_check'
        AND table_name = 'contents'
    ) THEN
        ALTER TABLE contents ADD CONSTRAINT contents_content_purpose_check
        CHECK (content_purpose IS NULL OR content_purpose IN (
            'EDUCATION', 'ENTERTAINMENT', 'INSPIRATIONAL', 'PROMOTION', 'INFORMATION'
        ));
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'contents_posting_category_check'
        AND table_name = 'contents'
    ) THEN
        ALTER TABLE contents ADD CONSTRAINT contents_posting_category_check
        CHECK (posting_category IS NULL OR posting_category IN (
            'ORIGINAL', 'REPOST_PLN_ID', 'REPOST_UP3', 'CAMPAIGN', 'OTHER'
        ));
    END IF;
END$$;
