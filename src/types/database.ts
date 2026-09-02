export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          is_active?: boolean
        }
        Update: {
          email?: string
          full_name?: string
          role?: string
          is_active?: boolean
        }
      }
      pillars: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
        }
        Update: {
          name?: string
          description?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
        }
        Update: {
          name?: string
          description?: string | null
        }
      }
      platforms: {
        Row: {
          id: string
          name: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
        }
        Update: {
          name?: string
          icon?: string | null
        }
      }
      content_ideas: {
        Row: {
          id: string
          title: string
          description: string | null
          pillar_id: string | null
          target_audience: string | null
          source: string | null
          notes: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          pillar_id?: string | null
          target_audience?: string | null
          source?: string | null
          notes?: string | null
          status?: string
          created_by?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          pillar_id?: string | null
          target_audience?: string | null
          source?: string | null
          notes?: string | null
          status?: string
        }
      }
      contents: {
        Row: {
          id: string
          title: string
          topic: string
          pillar_id: string | null
          category_id: string | null
          platform_id: string | null
          format: string
          brief: string | null
          target_audience: string | null
          planned_date: string | null
          planned_week: number | null
          pic: string | null
          priority: string | null
          status: string
          source_idea_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          title: string
          topic: string
          pillar_id?: string | null
          category_id?: string | null
          platform_id?: string | null
          format: string
          brief?: string | null
          target_audience?: string | null
          planned_date?: string | null
          planned_week?: number | null
          pic?: string | null
          priority?: string | null
          status?: string
          source_idea_id?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          title?: string
          topic?: string
          pillar_id?: string | null
          category_id?: string | null
          platform_id?: string | null
          format?: string
          brief?: string | null
          target_audience?: string | null
          planned_date?: string | null
          planned_week?: number | null
          pic?: string | null
          priority?: string | null
          status?: string
          source_idea_id?: string | null
          updated_by?: string | null
        }
      }
      publications: {
        Row: {
          id: string
          content_id: string
          platform_id: string | null
          planned_publish_date: string | null
          actual_publish_date: string | null
          url: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content_id: string
          platform_id?: string | null
          planned_publish_date?: string | null
          actual_publish_date?: string | null
          url?: string | null
          status?: string
          notes?: string | null
        }
        Update: {
          platform_id?: string | null
          planned_publish_date?: string | null
          actual_publish_date?: string | null
          url?: string | null
          status?: string
          notes?: string | null
        }
      }
      performance_metrics: {
        Row: {
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
        Insert: {
          id?: string
          publication_id: string
          views?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          reach?: number
          recorded_at: string
        }
        Update: {
          views?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          reach?: number
          recorded_at?: string
        }
      }
      approval_histories: {
        Row: {
          id: string
          content_id: string
          action: string
          from_status: string | null
          to_status: string
          comment: string | null
          performed_by: string | null
          performed_at: string
        }
        Insert: {
          id?: string
          content_id: string
          action: string
          from_status?: string | null
          to_status: string
          comment?: string | null
          performed_by?: string | null
          performed_at?: string
        }
        Update: {
          action?: string
          from_status?: string | null
          to_status?: string
          comment?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
