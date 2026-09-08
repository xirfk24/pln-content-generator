package ai

import "log"

// Provider abstracts the AI backend. Implementations: Gemini (real) and mock (fallback).
type Provider interface {
	Model() string
	GenerateContent(in GenerateContentInput) GenerateContentOutput
	ImproveContent(in ImproveContentInput) ImproveContentOutput
	ReviewContent(in ReviewContentInput) ReviewContentOutput
	AnalyzePerformance(avgRate float64, totalViews, totalLikes, totalContent, published int) PerformanceAnalysisOutput
	GenerateRecommendations(underperforming []string) RecommendationOutput
}

// NewProvider returns a Gemini-backed provider when apiKey is set,
// otherwise the deterministic mock. Gemini failures fall back to mock
// so the demo never breaks.
func NewProvider(apiKey string) Provider {
	if apiKey == "" {
		log.Println("AI: GEMINI_API_KEY not set — using mock provider")
		return NewMockProvider()
	}
	log.Println("AI: using Gemini provider")
	return NewGeminiProvider(apiKey)
}
