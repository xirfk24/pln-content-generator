export type UserRole = 'ADMIN' | 'STAFF'

export type ContentStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PRODUCTION'
  | 'PENDING_PRODUCTION_REVIEW'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'RESCHEDULED'
  | 'NOT_REALIZED'

export type PublicationStatus = 'PLANNED' | 'PUBLISHED' | 'DELAYED' | 'CANCELLED' | 'DELAY' | 'CANCEL'

export type ApprovalAction =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'CONCEPT_REVISION_REQUESTED'
  | 'START_PRODUCTION'
  | 'PRODUCTION_SUBMITTED'
  | 'PRODUCTION_APPROVED'
  | 'PRODUCTION_REVISION_REQUESTED'
  | 'SHORTCUT_READY'
  | 'MARK_PUBLISHED'
  | 'REVISION_FROM_READY'
  | 'REJECTED'
  // legacy actions
  | 'START_PROGRESS'
  | 'REVISION_REQUESTED'
  | 'FINAL_APPROVED'
  | 'RESUBMITTED'
  | 'REVIEWED'
  | 'REVIEW_APPROVED'

export type ContentPurpose = 
  | 'INFORMASI'
  | 'EDUKASI'
  | 'PUBLIKASI_KEGIATAN'
  | 'BRANDING'
  | 'DOKUMENTASI'
  | 'ENGAGEMENT'
  | 'EDUCATION' 
  | 'ENTERTAINMENT' 
  | 'INSPIRATIONAL' 
  | 'PROMOTION' 
  | 'INFORMATION'

export type PostingCategory =
  | 'ORIGINAL'
  | 'REPOST_PLN_ID'
  | 'REPOST_UP3'
  | 'CAMPAIGN'
  | 'OTHER'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Pillar {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Platform {
  id: string
  name: string
  icon: string | null
  created_at: string
}

export interface Content {
  id: string
  title: string
  topic: string
  pillar_id: string | null
  category_id: string | null
  platform_id: string | null
  platform_ids?: string[]
  format: string
  brief: string | null
  content_purpose: string | null
  content_purposes?: string[]
  posting_category: string | null
  target_audience: string | null
  planned_date: string | null
  planned_week: number | null
  day: string | null
  brief_link?: string | null
  production_link?: string | null
  pic: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null
  status: ContentStatus
  is_savings?: boolean
  savings_reason?: string | null
  savings_month?: string | null
  saved_at?: string | null
  source_idea_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
  pillar?: Pillar
  category?: Category
  platform?: Platform
  platforms?: Platform[]
  publications?: Publication[]
}

export interface Publication {
  id: string
  content_id: string
  platform_id: string | null
  planned_publish_date: string | null
  actual_publish_date: string | null
  url: string | null
  status: PublicationStatus
  notes: string | null
  cancel_reason?: string | null
  created_at: string
  updated_at: string
  platform?: Platform
  content?: {
    id: string
    title: string
    topic: string
    status: string
    pic: string | null
    pillar_name?: string | null
  }
  performance_metrics?: PerformanceMetric[]
}

export interface PerformanceMetric {
  id: string
  publication_id: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  recorded_at: string
  created_at: string
}

export interface ApprovalHistory {
  id: string
  content_id: string
  action: ApprovalAction
  from_status: ContentStatus | null
  to_status: ContentStatus
  comment: string | null
  performed_by: string
  performed_at: string
  performer?: User
}

export interface DashboardStats {
  totalContent: number
  draft: number
  planned?: number // backward compatibility
  inProgress: number
  pendingReview: number
  approved: number
  published: number
  rescheduled: number
  notRealized: number
}

export type PlanningPeriodStatus = 'DRAFT' | 'AKTIF' | 'SELESAI' | 'DIARSIPKAN'

export interface PlanningPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: PlanningPeriodStatus
  description?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  total_contents: number
  published_count: number
  draft_count: number
  pending_count: number
  approved_count: number
  production_count: number
}

export interface MonthBreakdown {
  month_key: string
  month_name: string
  start_date: string
  end_date: string
  total_count: number
}

