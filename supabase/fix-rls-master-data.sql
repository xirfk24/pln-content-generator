-- Fix RLS: enable public read access untuk master data tables
-- Run di Supabase SQL Editor

-- Enable RLS (kalau belum)
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (jika ada)
DROP POLICY IF EXISTS "Public can view pillars" ON pillars;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Public can view platforms" ON platforms;
DROP POLICY IF EXISTS "Admins can manage pillars" ON pillars;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage platforms" ON platforms;

-- Public read access (semua authenticated users)
CREATE POLICY "Authenticated can view pillars" ON pillars FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can view categories" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can view platforms" ON platforms FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin full access
CREATE POLICY "Admins can manage pillars" ON pillars FOR ALL USING (public.has_role(ARRAY['ADMIN'])) WITH CHECK (public.has_role(ARRAY['ADMIN']));
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (public.has_role(ARRAY['ADMIN'])) WITH CHECK (public.has_role(ARRAY['ADMIN']));
CREATE POLICY "Admins can manage platforms" ON platforms FOR ALL USING (public.has_role(ARRAY['ADMIN'])) WITH CHECK (public.has_role(ARRAY['ADMIN']));
