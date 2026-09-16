package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	// URL tanpa key di query — key dikirim via header x-goog-api-key
	// supaya nggak bocor ke log (url.Error mencetak URL lengkap).
	geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"
	geminiModel    = "gemini-2.0-flash"
	geminiTimeout  = 45 * time.Second
)

// GeminiProvider calls the Google Generative Language API.
type GeminiProvider struct {
	apiKey string
	client *http.Client
}

func NewGeminiProvider(apiKey string) *GeminiProvider {
	return &GeminiProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: geminiTimeout},
	}
}

func (g *GeminiProvider) Model() string { return geminiModel }

// ── API wire types ──────────────────────────────────────────

type geminiRequest struct {
	Contents         []geminiContent `json:"contents"`
	GenerationConfig geminiGenConfig `json:"generationConfig"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenConfig struct {
	ResponseMimeType string  `json:"responseMimeType"`
	Temperature      float64 `json:"temperature"`
	MaxOutputTokens  int     `json:"maxOutputTokens"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// callGemini sends one prompt and returns the raw text response.
func (g *GeminiProvider) callGemini(ctx context.Context, prompt string) (string, error) {
	body, err := json.Marshal(geminiRequest{
		Contents: []geminiContent{{
			Role:  "user",
			Parts: []geminiPart{{Text: prompt}},
		}},
		GenerationConfig: geminiGenConfig{
			ResponseMimeType: "application/json",
			Temperature:      0.7,
			MaxOutputTokens:  2048,
		},
	})
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf(geminiEndpoint, geminiModel)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", g.apiKey)

	resp, err := g.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var parsed geminiResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("gemini: bad response: %s", string(raw[:min(len(raw), 200)]))
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("gemini: %s", parsed.Error.Message)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return parsed.Candidates[0].Content.Parts[0].Text, nil
}

// generateJSON calls Gemini and unmarshals the JSON response into out.
// On any failure it logs and returns false so the caller can fall back to mock.
func (g *GeminiProvider) generateJSON(ctx context.Context, prompt string, out any) bool {
	text, err := g.callGemini(ctx, prompt)
	if err != nil {
		log.Printf("AI gemini error: %v — falling back to mock", err)
		return false
	}
	// Strip possible markdown fences.
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if err := json.Unmarshal([]byte(text), out); err != nil {
		log.Printf("AI gemini: JSON parse failed: %v — falling back to mock", err)
		return false
	}
	return true
}

const brandContext = `Kamu adalah asisten konten media sosial untuk PLN (Perusahaan Listrik Negara), perusahaan listrik milik negara Indonesia.
Selalu jawab dalam Bahasa Indonesia yang hangat, edukatif, dan sesuai tone BUMN.
Pilar konten PLN: Edukasi (Educational), Hiburan (Entertainment), Inspirasi (Inspirational), Interaksi & Komunitas (Engagement), Promosi / Penjualan (Promotional), Di Balik Layar (Behind the Scenes), Bukti Sosial & Ulasan (Social Proof / Testimonials), Tren & Relevansi Terkini (Trending / Relatable), Berita & Wawasan Industri (Industry News & Insights), Solusi Masalah & FAQ (Problem Solving / Help).
Balas HANYA dengan JSON valid sesuai skema yang diminta, tanpa penjelasan tambahan.`

// ── Provider implementations ────────────────────────────────

func (g *GeminiProvider) GenerateContent(in GenerateContentInput) GenerateContentOutput {
	tone := in.Tone
	if tone == "" {
		tone = "edukatif"
	}
	audience := in.TargetAudience
	if audience == "" {
		audience = "masyarakat umum"
	}

	prompt := fmt.Sprintf(`%s

Buat konten media sosial dengan spesifikasi:
- Topik: %s
- Pillar: %s
- Platform: %s
- Format: %s
- Target audiens: %s
- Tone: %s

Balas dengan JSON: {"title": string, "hook": string, "brief": string, "caption": string, "cta": string, "hashtags": string[]}
- hook: 1 kalimat pembuka yang mencuri perhatian
- brief: 2-3 kalimat arahan produksi konten
- caption: caption siap pakai dengan emoji secukupnya dan line breaks
- hashtags: 5 hashtag relevan tanpa spasi, mulai dengan #`,
		brandContext, in.Topic, in.Pillar, in.Platform, in.Format, audience, tone)

	var out GenerateContentOutput
	if !g.generateJSON(context.Background(), prompt, &out) {
		return mockGenerateContent(in)
	}
	return out
}

func (g *GeminiProvider) ImproveContent(in ImproveContentInput) ImproveContentOutput {
	improvement := in.ImprovementType
	if improvement == "" {
		improvement = "all"
	}

	prompt := fmt.Sprintf(`%s

Perbaiki konten media sosial berikut:
---
%s
---
- Jenis perbaikan: %s
- Platform: %s
- Target audiens: %s

Balas dengan JSON: {"originalContent": string, "improvedContent": string, "suggestions": string[], "improvements": string[]}
- improvedContent: versi yang sudah diperbaiki, siap pakai
- improvements: daftar perubahan spesifik yang dilakukan
- suggestions: saran tambahan untuk pengembangan berikutnya`,
		brandContext, in.Content, improvement, in.Platform, in.TargetAudience)

	var out ImproveContentOutput
	if !g.generateJSON(context.Background(), prompt, &out) {
		return mockImproveContent(in)
	}
	if out.ImprovedContent == "" {
		return mockImproveContent(in)
	}
	return out
}

func (g *GeminiProvider) ReviewContent(in ReviewContentInput) ReviewContentOutput {
	prompt := fmt.Sprintf(`%s

Review konten media sosial berikut:
---
%s
---
- Platform: %s
- Target audiens: %s

Balas dengan JSON: {"overallScore": number, "categories": [{"name": string, "score": number, "status": string, "feedback": string}], "potentialIssues": string[], "suggestions": string[]}
- overallScore: 0-100
- categories: 5 kategori wajib — Clarity, Tone, Audience, CTA, Engagement
- score: 0-100, status: salah satu dari "good" | "needs_improvement" | "poor" (good >= 75, needs_improvement >= 55, poor < 55)
- feedback: 1 kalimat alasan skor
- potentialIssues: masalah konkret yang ditemukan (kosongkan jika tidak ada)
- suggestions: saran perbaikan konkret`,
		brandContext, in.Content, in.Platform, in.TargetAudience)

	var out ReviewContentOutput
	if !g.generateJSON(context.Background(), prompt, &out) {
		return mockReviewContent(in)
	}
	if len(out.Categories) == 0 {
		return mockReviewContent(in)
	}
	return out
}

func (g *GeminiProvider) AnalyzePerformance(avgRate float64, totalViews, totalLikes, totalContent, published int) PerformanceAnalysisOutput {
	prompt := fmt.Sprintf(`%s

Analisis performa konten media sosial PLN:
- Total konten: %d (terpublikasi: %d)
- Total views: %d
- Total likes: %d
- Rata-rata engagement rate: %.2f%%

Balas dengan JSON: {"summary": string, "keyFindings": string[], "possibleReasons": string[], "recommendedActions": string[], "opportunities": string[]}
- summary: 1-2 kalimat kesimpulan performa
- keyFindings: 2-4 temuan utama dari angka di atas
- possibleReasons: interpretasi penyebab (kosongkan jika performa baik)
- recommendedActions: 2-4 tindakan konkret
- opportunities: peluang yang bisa dieksplorasi`,
		brandContext, totalContent, published, totalViews, totalLikes, avgRate)

	var out PerformanceAnalysisOutput
	if !g.generateJSON(context.Background(), prompt, &out) || out.Summary == "" {
		return mockAnalyzePerformance(avgRate, totalViews, totalLikes, totalContent, published)
	}
	return out
}

func (g *GeminiProvider) GenerateRecommendations(underperforming []string) RecommendationOutput {
	pillarList := strings.Join(underperforming, ", ")
	if pillarList == "" {
		pillarList = "(tidak ada — semua pillar perform baik)"
	}

	prompt := fmt.Sprintf(`%s

Buat rekomendasi strategi konten.
Pillar dengan engagement rate di bawah 3%%: %s

Balas dengan JSON: {"recommendations": [{"title": string, "reason": string, "suggestedPillar": string, "suggestedFormat": string, "suggestedPlatform": string, "expectedObjective": string, "confidence": number}]}
- 3-5 rekomendasi, fokus pada pillar yang underperforming
- suggestedPillar: salah satu dari 6 pillar PLN
- suggestedFormat: contoh "Short Video", "Carousel", "Infographic"
- suggestedPlatform: "Instagram" | "TikTok" | "YouTube" | "Facebook" | "Twitter/X"
- expectedObjective: "Awareness" | "Engagement" | "Education"
- confidence: 0-1
- Semua teks dalam Bahasa Indonesia`,
		brandContext, pillarList)

	var out RecommendationOutput
	if !g.generateJSON(context.Background(), prompt, &out) || len(out.Recommendations) == 0 {
		return mockGenerateRecommendations(underperforming)
	}
	return out
}
