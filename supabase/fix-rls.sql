-- RLS fix — IDEMPOTENT version. Safe to run multiple times.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.has_role(roles text[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$;

-- ============ profiles ============
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (public.has_role(ARRAY['ADMIN']))
  WITH CHECK (public.has_role(ARRAY['ADMIN']));

-- ============ content_ideas ============
DROP POLICY IF EXISTS "Staff and admins can insert content ideas" ON content_ideas;
CREATE POLICY "Staff and admins can insert content ideas" ON content_ideas
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

DROP POLICY IF EXISTS "Staff and admins can update content ideas" ON content_ideas;
CREATE POLICY "Staff and admins can update content ideas" ON content_ideas
  FOR UPDATE USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

DROP POLICY IF EXISTS "Admins can delete content ideas" ON content_ideas;
CREATE POLICY "Admins can delete content ideas" ON content_ideas
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- ============ contents ============
DROP POLICY IF EXISTS "Staff and admins can manage contents" ON contents;
DROP POLICY IF EXISTS "Staff and admins can insert contents" ON contents;
DROP POLICY IF EXISTS "Workflow roles can update contents" ON contents;
DROP POLICY IF EXISTS "Admins can delete contents" ON contents;

CREATE POLICY "Staff and admins can insert contents" ON contents
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

CREATE POLICY "Workflow roles can update contents" ON contents
  FOR UPDATE USING (public.has_role(ARRAY['ADMIN','STAFF','REVIEWER','APPROVER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF','REVIEWER','APPROVER']));

CREATE POLICY "Admins can delete contents" ON contents
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- ============ publications ============
DROP POLICY IF EXISTS "Staff and admins can manage publications" ON publications;
DROP POLICY IF EXISTS "Staff and admins can insert publications" ON publications;
DROP POLICY IF EXISTS "Staff and admins can update publications" ON publications;
DROP POLICY IF EXISTS "Admins can delete publications" ON publications;

CREATE POLICY "Staff and admins can insert publications" ON publications
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

CREATE POLICY "Staff and admins can update publications" ON publications
  FOR UPDATE USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

CREATE POLICY "Admins can delete publications" ON publications
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- ============ performance_metrics ============
DROP POLICY IF EXISTS "Staff and admins can manage performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Staff and admins can insert performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Staff and admins can update performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Admins can delete performance metrics" ON performance_metrics;

CREATE POLICY "Staff and admins can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

CREATE POLICY "Staff and admins can update performance metrics" ON performance_metrics
  FOR UPDATE USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));

CREATE POLICY "Admins can delete performance metrics" ON performance_metrics
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- ============ approval_histories ============
DROP POLICY IF EXISTS "Reviewers and approvers can insert approval histories" ON approval_histories;
DROP POLICY IF EXISTS "Authenticated can insert approval histories" ON approval_histories;
CREATE POLICY "Authenticated can insert approval histories" ON approval_histories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
