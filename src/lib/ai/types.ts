export interface AIProvider {
  generateIdeas(input: IdeaGenerationInput): Promise<AIResponse<IdeaGenerationOutput>>
  generateContent(input: ContentGenerationInput): Promise<AIResponse<ContentGenerationOutput>>
  improveContent(input: ContentImprovementInput): Promise<AIResponse<ContentImprovementOutput>>
  reviewContent(input: ContentReviewInput): Promise<AIResponse<ContentReviewOutput>>
  analyzePerformance(input: PerformanceAnalysisInput): Promise<AIResponse<PerformanceAnalysisOutput>>
  generateRecommendations(input: RecommendationInput): Promise<AIResponse<RecommendationOutput>>
}

export interface AIResponse<T> {
  success: boolean
  data?: T
  error?: string
  generatedAt: Date
  modelUsed: string
}

export interface IdeaGenerationInput {
  pillar: string
  platform: string
  targetAudience?: string
  objective?: string
  count?: number
}

export interface IdeaGenerationOutput {
  ideas: Array<{
    title: string
    description: string
    targetAudience: string
    suggestedFormat: string
    reason: string
  }>
}

export interface ContentGenerationInput {
  topic: string
  pillar: string
  platform: string
  format: string
  targetAudience?: string
  tone?: string
  additionalContext?: string
}

export interface ContentGenerationOutput {
  title: string
  hook: string
  brief: string
  caption: string
  cta: string
  hashtags: string[]
}

export interface ContentImprovementInput {
  originalContent: string
  improvementType: 'clarity' | 'engagement' | 'tone' | 'cta' | 'all'
  targetAudience?: string
  platform?: string
}

export interface ContentImprovementOutput {
  originalContent: string
  improvedContent: string
  suggestions: string[]
  improvements: string[]
}

export interface ContentReviewInput {
  content: string
  platform: string
  targetAudience?: string
}

export interface ContentReviewOutput {
  overallScore: number
  categories: {
    name: string
    score: number
    status: 'good' | 'needs_improvement' | 'poor'
    feedback: string
  }[]
  potentialIssues: string[]
  suggestions: string[]
}

export interface PerformanceAnalysisInput {
  data: {
    dateRange: { start: string; end: string }
    totalViews: number
    totalLikes: number
    totalComments: number
    totalShares: number
    avgEngagementRate: number
    topContent: Array<{
      title: string
      views: number
      engagementRate: number
    }>
    byPlatform: Record<string, { views: number; engagement: number }>
    byPillar: Record<string, { count: number; avgEngagement: number }>
  }
}

export interface PerformanceAnalysisOutput {
  summary: string
  keyFindings: string[]
  possibleReasons: string[]
  recommendedActions: string[]
  opportunities: string[]
}

export interface RecommendationInput {
  historicalData: {
    topPerformingContent: Array<{
      title: string
      pillar: string
      platform: string
      format: string
      engagementRate: number
    }>
    underperformingAreas: string[]
    recentTrends: string[]
  }
}

export interface RecommendationOutput {
  recommendations: Array<{
    title: string
    reason: string
    suggestedPillar: string
    suggestedFormat: string
    suggestedPlatform: string
    expectedObjective: string
    confidence: number
  }>
}
