package ai

import (
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"
)

type GenerateContentInput struct {
	Topic          string `json:"topic"`
	Pillar         string `json:"pillar"`
	Platform       string `json:"platform"`
	Format         string `json:"format"`
	TargetAudience string `json:"targetAudience"`
	Tone           string `json:"tone"`
}

type GenerateContentOutput struct {
	Title    string   `json:"title"`
	Hook     string   `json:"hook"`
	Brief    string   `json:"brief"`
	Caption  string   `json:"caption"`
	CTA      string   `json:"cta"`
	Hashtags []string `json:"hashtags"`
}

type ImproveContentInput struct {
	Content         string `json:"content"`
	ImprovementType string `json:"improvementType"`
	TargetAudience  string `json:"targetAudience"`
	Platform        string `json:"platform"`
}

type ImproveContentOutput struct {
	OriginalContent   string   `json:"originalContent"`
	ImprovedContent   string   `json:"improvedContent"`
	Suggestions       []string `json:"suggestions"`
	Improvements      []string `json:"improvements"`
}

type ReviewContentInput struct {
	Content        string `json:"content"`
	Platform       string `json:"platform"`
	TargetAudience string `json:"targetAudience"`
}

type ReviewScore struct {
	Name     string  `json:"name"`
	Score    int     `json:"score"`
	Status   string  `json:"status"`
	Feedback string  `json:"feedback"`
}

type ReviewContentOutput struct {
	OverallScore    int          `json:"overallScore"`
	Categories      []ReviewScore `json:"categories"`
	PotentialIssues []string     `json:"potentialIssues"`
	Suggestions     []string     `json:"suggestions"`
}

type PerformanceAnalysisOutput struct {
	Summary            string   `json:"summary"`
	KeyFindings        []string `json:"keyFindings"`
	PossibleReasons    []string `json:"possibleReasons"`
	RecommendedActions []string `json:"recommendedActions"`
	Opportunities      []string `json:"opportunities"`
}

type Recommendation struct {
	Title             string  `json:"title"`
	Reason            string  `json:"reason"`
	SuggestedPillar   string  `json:"suggestedPillar"`
	SuggestedFormat   string  `json:"suggestedFormat"`
	SuggestedPlatform string  `json:"suggestedPlatform"`
	ExpectedObjective string  `json:"expectedObjective"`
	Confidence        float64 `json:"confidence"`
}

type RecommendationOutput struct {
	Recommendations []Recommendation `json:"recommendations"`
}

const modelUsed = "mock-provider-v1"

var hooks = []string{
	"Masih borong listrik tiap bulan?",
	"Cara ini bisa hemat 30% tagihan!",
	"Rahasia hemat listrik yang jarang diketahui",
	"Stop! Jangan biarkan listrik terbuang sia-sia",
}

var ctas = []string{
	"Simpan post ini untuk referensi!",
	"Share ke keluarga biar hemat bareng!",
	"Klik link di bio untuk info lebih lanjut",
	"Comment \"HEMAT\" untuk tips tambahan!",
}

var pillarKeywords = map[string][]string{
	"Keselamatan Listrik":   {"aman", "bahaya", "hati-hati", "standar", "SPLN"},
	"Informasi Layanan":     {"mudah", "cepat", "praktis", "online", "mobile"},
	"Kegiatan Perusahaan":   {"berhasil", "pencapaian", "kolaborasi", "tim"},
	"Hari Besar Nasional":   {"nasional", "bangsa", "indonesia", "bersatu"},
	"Tips Kelistrikan":      {"hemat", "praktis", "tips", "trik", "mudah"},
	"Program Sosial":        {"peduli", "bantu", "dukung", "bersama"},
}

func keywordsFor(pillar string) []string {
	if kw, ok := pillarKeywords[pillar]; ok {
		return kw
	}
	return pillarKeywords["Tips Kelistrikan"]
}

var (
	hasCtaRe  = regexp.MustCompile(`(?i)(simpan|share|klik|download|daftar|comment|hubungi|cek|kunjungi|swipe)`)
	hasEmojiRe = regexp.MustCompile("[\U0001F300-\U0001FAFF\u2600-\u27BF]")
	hasDigitRe = regexp.MustCompile(`\d`)
	whitespaceRe = regexp.MustCompile(`\s+`)
)

func GenerateContent(in GenerateContentInput) GenerateContentOutput {
	kw := keywordsFor(in.Pillar)
	tone := in.Tone
	if tone == "" {
		tone = "edukatif"
	}
	audience := in.TargetAudience
	if audience == "" {
		audience = "masyarakat umum"
	}

	kwLine := kw[rand.Intn(len(kw))] + " • " + kw[rand.Intn(len(kw))] + " • " + kw[rand.Intn(len(kw))]
	pillarTag := strings.ReplaceAll(in.Pillar, " ", "")

	return GenerateContentOutput{
		Title: in.Topic + " - " + in.Pillar,
		Hook:  hooks[rand.Intn(len(hooks))],
		Brief: fmt.Sprintf("Konten %s tentang %s dengan pendekatan %s untuk %s. Fokus pada value dan informasi bermanfaat.", in.Format, in.Topic, tone, audience),
		Caption: fmt.Sprintf("💡 %s\n\n%s\n\nYuk simak tips lengkapnya!\n\n#%s #PLN #ListrikCerdas", in.Topic, kwLine, pillarTag),
		CTA:      ctas[rand.Intn(len(ctas))],
		Hashtags: []string{"#" + pillarTag, "#PLN", "#ListrikCerdas", "#HematEnergi", "#TipsListrik"},
	}
}

func ImproveContent(in ImproveContentInput) ImproveContentOutput {
	improvements := []string{}
	suggestions := []string{}

	content := in.Content
	if !strings.Contains(content, "?") {
		improvements = append(improvements, "Hook pembuka dengan pertanyaan agar lebih engaging")
		suggestions = append(suggestions, "Buka dengan pertanyaan yang relevan dengan audiens")
	}
	if !hasEmojiRe.MatchString(content) {
		improvements = append(improvements, "Tambahkan emoji untuk visual appeal")
		suggestions = append(suggestions, "Gunakan 2-3 emoji relevan di poin penting")
	}
	if !hasCtaRe.MatchString(content) {
		improvements = append(improvements, "CTA belum jelas")
		suggestions = append(suggestions, "Tambahkan CTA spesifik di akhir konten")
	}
	if len(improvements) == 0 {
		improvements = append(improvements, "Struktur konten sudah baik")
		suggestions = append(suggestions, "Pertahankan kualitas, uji A/B variasi caption")
	}

	improved := content
	if !strings.Contains(content, "?") {
		improved = "Tahukah kamu? " + improved
	}
	improved += "\n\n👉 Simpan & share post ini!"

	return ImproveContentOutput{
		OriginalContent: in.Content,
		ImprovedContent: improved,
		Suggestions:     suggestions,
		Improvements:    improvements,
	}
}

func statusFor(score int) string {
	if score >= 75 {
		return "good"
	}
	if score >= 55 {
		return "needs_improvement"
	}
	return "poor"
}

func ReviewContent(in ReviewContentInput) ReviewContentOutput {
	original := in.Content
	trimmed := strings.TrimSpace(original)
	wordCount := 1
	if trimmed == "" {
		wordCount = 0
	} else {
		wordCount = len(whitespaceRe.Split(trimmed, -1))
	}
	hasQuestion := strings.Contains(original, "?")
	hasCta := hasCtaRe.MatchString(original)
	hasEmoji := hasEmojiRe.MatchString(original)
	hasNumbers := hasDigitRe.MatchString(original)

	clarityScore := 82
	if wordCount > 150 {
		clarityScore = 62
	} else if wordCount < 5 {
		clarityScore = 55
	}
	toneScore := 78
	if hasEmoji {
		toneScore += 6
	}
	audienceScore := 68
	if in.TargetAudience != "" {
		audienceScore = 80
	}
	ctaScore := 55
	if hasCta {
		ctaScore = 85
	}
	engagementScore := 62
	if hasQuestion {
		engagementScore = 78
	}
	if hasNumbers {
		engagementScore += 6
	}

	overall := (clarityScore + toneScore + audienceScore + ctaScore + engagementScore) / 5

	issues := []string{}
	suggestions := []string{}
	if !hasCta {
		issues = append(issues, "Tidak ada CTA yang jelas — audiens tidak tahu langkah selanjutnya")
		suggestions = append(suggestions, "Tambahkan CTA spesifik di akhir (mis. \"Simpan post ini!\")")
	}
	if !hasQuestion {
		issues = append(issues, "Hook pembuka kurang menarik perhatian")
		suggestions = append(suggestions, "Buka dengan pertanyaan atau fakta mengejutkan")
	}
	if wordCount > 150 {
		issues = append(issues, "Teks terlalu panjang untuk media sosial (idealnya < 150 kata)")
		suggestions = append(suggestions, "Ringkas menjadi poin-poin utama")
	}
	if !hasNumbers {
		issues = append(issues, "Klaim belum didukung angka atau data")
		suggestions = append(suggestions, "Sertakan statistik atau angka pendukung")
	}
	if len(suggestions) == 0 {
		suggestions = append(suggestions, "Konten sudah memenuhi kualitas dasar — pertahankan")
	}

	feedback := func(good, bad string, ok bool) string {
		if ok {
			return good
		}
		return bad
	}

	return ReviewContentOutput{
		OverallScore: overall,
		Categories: []ReviewScore{
			{Name: "Clarity", Score: clarityScore, Status: statusFor(clarityScore), Feedback: feedback("Struktur kalimat mudah dipahami", "Kalimat terlalu panjang atau terlalu pendek", wordCount >= 5 && wordCount <= 150)},
			{Name: "Tone", Score: toneScore, Status: statusFor(toneScore), Feedback: feedback("Tone sesuai media sosial", "Tone terlalu formal untuk media sosial", hasEmoji)},
			{Name: "Audience", Score: audienceScore, Status: statusFor(audienceScore), Feedback: feedback("Sesuaikan dengan target audiens", "Target audiens belum terlihat spesifik", in.TargetAudience != "")},
			{Name: "CTA", Score: ctaScore, Status: statusFor(ctaScore), Feedback: feedback("CTA jelas dan actionable", "Tidak ada CTA yang terdeteksi", hasCta)},
			{Name: "Engagement", Score: engagementScore, Status: statusFor(engagementScore), Feedback: feedback("Elemen engagement cukup", "Kurang elemen interaktif (pertanyaan/angka)", hasQuestion || hasNumbers)},
		},
		PotentialIssues: issues,
		Suggestions:     suggestions,
	}
}

func AnalyzePerformance(avgRate float64, totalViews, totalLikes, totalContent, published int) PerformanceAnalysisOutput {
	findings := []string{
		fmt.Sprintf("Total %d konten dengan %d sudah dipublikasikan", totalContent, published),
		fmt.Sprintf("Akumulasi %d views dan %d likes", totalViews, totalLikes),
	}
	reasons := []string{}
	actions := []string{}
	if avgRate < 3 {
		reasons = append(reasons, "Engagement rate di bawah 3% — konten kurang resonan dengan audiens")
		actions = append(actions, "Eksperimen dengan hook dan format konten berbeda")
	} else {
		actions = append(actions, "Pertahankan strategi konten saat ini")
	}
	actions = append(actions, "Post konsisten di jam prime time audiens")

	return PerformanceAnalysisOutput{
		Summary:            fmt.Sprintf("Rata-rata engagement rate %.1f%% dari %d konten terpublikasi.", avgRate, published),
		KeyFindings:        findings,
		PossibleReasons:    reasons,
		RecommendedActions: actions,
		Opportunities:      []string{"Format video pendek (Reels/TikTok) untuk jangkauan organik"},
	}
}

func GenerateRecommendations(underperforming []string) RecommendationOutput {
	recs := []Recommendation{}
	for _, pillar := range underperforming {
		recs = append(recs, Recommendation{
			Title:             "Evaluasi pillar " + pillar,
			Reason:            "Avg engagement rate di bawah 3% — pertimbangkan refresh angle",
			SuggestedPillar:   pillar,
			SuggestedFormat:   "Short Video",
			SuggestedPlatform: "Instagram",
			ExpectedObjective: "Engagement",
			Confidence:        0.7,
		})
	}
	if len(recs) == 0 {
		recs = append(recs, Recommendation{
			Title:             "Perbanyak konten Tips Kelistrikan",
			Reason:            "Pillar ini konsisten perform dengan engagement di atas rata-rata",
			SuggestedPillar:   "Tips Kelistrikan",
			SuggestedFormat:   "Carousel",
			SuggestedPlatform: "Instagram",
			ExpectedObjective: "Awareness",
			Confidence:        0.85,
		})
	}
	return RecommendationOutput{Recommendations: recs}
}

// GeneratedAt returns a fresh timestamp for responses.
func GeneratedAt() time.Time { return time.Now() }
