export type UserRole = 'ADMIN' | 'STAFF' | 'REVIEWER' | 'APPROVER'

export type ContentStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'RESCHEDULED'
  | 'NOT_REALIZED'

export type IdeaStatus = 'DRAFT' | 'SELECTED' | 'CONVERTED' | 'ARCHIVED'

export type PublicationStatus = 'PLANNED' | 'PUBLISHED' | 'DELAYED' | 'CANCELLED'

export type ApprovalAction =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'REVISION_REQUESTED'
  | 'REVIEW_APPROVED'
  | 'FINAL_APPROVED'
  | 'REJECTED'
  | 'RESUBMITTED'

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

export interface ContentIdea {
  id: string
  title: string
  description: string | null
  pillar_id: string
  target_audience: string | null
  source: string | null
  notes: string | null
  status: IdeaStatus
  created_by: string
  created_at: string
  updated_at: string
  pillar?: Pillar
}

export interface Content {
  id: string
  title: string
  topic: string
  pillar_id: string
  category_id: string | null
  platform_id: string
  format: string
  brief: string | null
  target_audience: string | null
  planned_date: string | null
  planned_week: number | null
  day: string | null
  reference: string | null
  pic: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null
  status: ContentStatus
  source_idea_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
  pillar?: Pillar
  category?: Category
  platform?: Platform
  publications?: Publication[]
}

export interface Publication {
  id: string
  content_id: string
  platform_id: string
  planned_publish_date: string | null
  actual_publish_date: string | null
  url: string | null
  status: PublicationStatus
  notes: string | null
  created_at: string
  updated_at: string
  platform?: Platform
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
  planned: number
  inProgress: number
  pendingReview: number
  approved: number
  published: number
  rescheduled: number
  notRealized: number
}

export interface PerformanceStats {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngagementRate: number
}
