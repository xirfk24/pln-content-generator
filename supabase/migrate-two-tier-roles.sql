-- Migration: simplify roles to two-tier model (STAFF operator / ADMIN gatekeeper)
-- Run in Supabase SQL Editor. Idempotent.

-- 1. Collapse profiles.role: REVIEWER/APPROVER → ADMIN (gatekeepers)
--    Existing ADMINs stay ADMIN; STAFF stays STAFF.
UPDATE profiles
SET role = 'ADMIN'
WHERE role IN ('REVIEWER', 'APPROVER');

-- 2. Loosen the CHECK constraint to the two-tier model
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('ADMIN', 'STAFF'));

-- 3. Backfill missing profiles for auth.users that have none
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT u.id, u.email, COALESCE(
  (u.raw_user_meta_data->>'full_name'), split_part(u.email, '@', 1)
), 'STAFF', TRUE
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Deactivate legacy demo accounts (reviewer/approver) — keep rows for history FK
UPDATE profiles
SET is_active = FALSE
WHERE email IN ('reviewer@pln.co.id', 'approver@pln.co.id');
