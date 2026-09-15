package models

import "time"

// Time is a plain alias used by scan helpers.
type Time = time.Time

type Profile struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	FullName  *string    `json:"full_name"`
	Role      string     `json:"role"`
	IsActive  *bool      `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type Pillar struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type Category struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Icon        *string   `json:"icon"`
	CreatedAt   time.Time `json:"created_at"`
}

type Platform struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Icon      *string   `json:"icon"`
	CreatedAt time.Time `json:"created_at"`
}

type Content struct {
	ID              string      `json:"id"`
	Title           string      `json:"title"`
	Topic           string      `json:"topic"`
	PillarID        *string     `json:"pillar_id"`
	CategoryID      *string     `json:"category_id"`
	PlatformID      *string     `json:"platform_id"`
	PlatformIDs     []string    `json:"platform_ids"`
	Format          *string     `json:"format"`
	Brief           *string     `json:"brief"`
	ContentPurpose  *string     `json:"content_purpose"`
	ContentPurposes []string    `json:"content_purposes"`
	PostingCategory *string     `json:"posting_category"`
	TargetAudience  *string     `json:"target_audience"`
	PlannedDate     *string     `json:"planned_date"`
	PlannedWeek     *int        `json:"planned_week"`
	Day             *string     `json:"day"`
	Reference       *string     `json:"reference,omitempty"`
	BriefLink       *string     `json:"brief_link"`
	ResultLink      *string     `json:"result_link,omitempty"`
	Pic             *string     `json:"pic"`
	Priority        *string     `json:"priority"`
	Status          string      `json:"status"`
	IsSavings       bool        `json:"is_savings"`
	SavingsReason   *string     `json:"savings_reason,omitempty"`
	SavingsMonth    *string     `json:"savings_month,omitempty"`
	SavedAt         *time.Time  `json:"saved_at,omitempty"`
	SourceIdeaID    *string     `json:"source_idea_id"`
	CreatedBy       *string     `json:"created_by"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	UpdatedBy       *string     `json:"updated_by"`

	Pillar       *Pillar        `json:"pillar,omitempty"`
	Category     *Category      `json:"category,omitempty"`
	Platform     *Platform      `json:"platform,omitempty"`
	Platforms    []Platform     `json:"platforms,omitempty"`
	Publications []Publication  `json:"publications,omitempty"`
}

type Publication struct {
	ID                 string    `json:"id"`
	ContentID          string    `json:"content_id"`
	PlatformID         *string   `json:"platform_id"`
	PlannedPublishDate *string   `json:"planned_publish_date"`
	ActualPublishDate  *string   `json:"actual_publish_date"`
	URL                *string   `json:"url"`
	Status             string    `json:"status"`
	Notes              *string   `json:"notes"`
	CancelReason       *string   `json:"cancel_reason,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	Platform           *Platform           `json:"platform,omitempty"`
	Content            *PublicationContent `json:"content,omitempty"`
	PerformanceMetrics []PerformanceMetric `json:"performance_metrics,omitempty"`
}

type PublicationContent struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Topic  string  `json:"topic"`
	Status string  `json:"status"`
	Pic    *string `json:"pic"`
}

type PerformanceMetric struct {
	ID            string    `json:"id"`
	PublicationID string    `json:"publication_id"`
	Views         int       `json:"views"`
	Likes         int       `json:"likes"`
	Comments      int       `json:"comments"`
	Shares        int       `json:"shares"`
	Saves         int       `json:"saves"`
	Reach         int       `json:"reach"`
	RecordedAt    string    `json:"recorded_at"`
	CreatedAt     time.Time `json:"created_at"`
}

type ApprovalHistory struct {
	ID          string    `json:"id"`
	ContentID   string    `json:"content_id"`
	Action      string    `json:"action"`
	FromStatus  *string   `json:"from_status"`
	ToStatus    string    `json:"to_status"`
	Comment     *string   `json:"comment"`
	PerformedBy string    `json:"performed_by"`
	PerformedAt time.Time `json:"performed_at"`
	Performer   *Profile  `json:"performer,omitempty"`
}
