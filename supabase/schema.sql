-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles (for reference, actual roles stored in user metadata)
-- ADMIN: Gatekeeper — approve/reject, master data, dashboard evaluation
--         (Asman Komunikasi & MSB Komunikasi/TJSL)
-- STAFF: Operator — draft, brief, AI assist, submit, publication proof

-- Pillars (Content Themes)
CREATE TABLE pillars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platforms
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Ideas
CREATE TABLE content_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pillar_id UUID REFERENCES pillars(id) ON DELETE SET NULL,
  target_audience VARCHAR(255),
  source VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SELECTED', 'CONVERTED', 'ARCHIVED')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contents (Main Content Entity)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  pillar_id UUID REFERENCES pillars(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
  format VARCHAR(50) NOT NULL,
  brief TEXT,
  target_audience VARCHAR(255),
  planned_date DATE,
  planned_week INTEGER,
  pic VARCHAR(255),
  priority VARCHAR(20) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'REVISION_REQUIRED',
    'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'RESCHEDULED', 'NOT_REALIZED'
  )),
  source_idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Publications (One content can have multiple publications on different platforms)
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
  planned_publish_date DATE,
  actual_publish_date DATE,
  url TEXT,
  status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'PUBLISHED', 'DELAYED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID REFERENCES publications(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval History
CREATE TABLE approval_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN (
    'SUBMITTED', 'REVIEWED', 'REVISION_REQUESTED', 'REVIEW_APPROVED',
    'FINAL_APPROVED', 'REJECTED', 'RESUBMITTED'
  )),
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  comment TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Requests (for logging)
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type VARCHAR(50) NOT NULL,
  input_data JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Outputs
CREATE TABLE ai_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
  output_data JSONB,
  model_used VARCHAR(50) DEFAULT 'MOCK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_ideas_pillar ON content_ideas(pillar_id);
CREATE INDEX idx_content_ideas_status ON content_ideas(status);
CREATE INDEX idx_content_ideas_created_by ON content_ideas(created_by);
CREATE INDEX idx_contents_pillar ON contents(pillar_id);
CREATE INDEX idx_contents_platform ON contents(platform_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_created_by ON contents(created_by);
CREATE INDEX idx_contents_planned_date ON contents(planned_date);
CREATE INDEX idx_publications_content ON publications(content_id);
CREATE INDEX idx_publications_platform ON publications(platform_id);
CREATE INDEX idx_publications_status ON publications(status);
CREATE INDEX idx_performance_publication ON performance_metrics(publication_id);
CREATE INDEX idx_approval_content ON approval_histories(content_id);
CREATE INDEX idx_approval_performed_by ON approval_histories(performed_by);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_pillars_updated_at BEFORE UPDATE ON pillars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_ideas_updated_at BEFORE UPDATE ON content_ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_publications_updated_at BEFORE UPDATE ON publications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;

-- Role helper (SECURITY DEFINER — avoids RLS recursion when checking roles)
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

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL
  USING (public.has_role(ARRAY['ADMIN']))
  WITH CHECK (public.has_role(ARRAY['ADMIN']));

-- Content Ideas policies
CREATE POLICY "All authenticated users can view content ideas" ON content_ideas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff and admins can insert content ideas" ON content_ideas
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Staff and admins can update content ideas" ON content_ideas
  FOR UPDATE
  USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Admins can delete content ideas" ON content_ideas
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- Contents policies
-- UPDATE allows all four roles: reviewer/approver change status
-- during the approval workflow (rules enforced in service layer).
CREATE POLICY "All authenticated users can view contents" ON contents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff and admins can insert contents" ON contents
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Workflow roles can update contents" ON contents
  FOR UPDATE
USING (public.has_role(ARRAY['ADMIN','STAFF']))
WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Admins can delete contents" ON contents
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- Publications policies
CREATE POLICY "All authenticated users can view publications" ON publications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff and admins can insert publications" ON publications
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Staff and admins can update publications" ON publications
  FOR UPDATE
  USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Admins can delete publications" ON publications
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- Performance Metrics policies
CREATE POLICY "All authenticated users can view performance metrics" ON performance_metrics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff and admins can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Staff and admins can update performance metrics" ON performance_metrics
  FOR UPDATE
  USING (public.has_role(ARRAY['ADMIN','STAFF']))
  WITH CHECK (public.has_role(ARRAY['ADMIN','STAFF']));
CREATE POLICY "Admins can delete performance metrics" ON performance_metrics
  FOR DELETE USING (public.has_role(ARRAY['ADMIN']));

-- Approval Histories policies
-- STAFF also inserts rows (submit/resubmit); action rules live in the service layer.
CREATE POLICY "All authenticated users can view approval histories" ON approval_histories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert approval histories" ON approval_histories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- AI Requests policies
CREATE POLICY "All authenticated users can view own ai requests" ON ai_requests FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "All authenticated users can insert ai requests" ON ai_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- AI Outputs policies
CREATE POLICY "All authenticated users can view ai outputs" ON ai_outputs FOR SELECT USING (true);
