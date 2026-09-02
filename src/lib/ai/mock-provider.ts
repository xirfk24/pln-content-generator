import type { AIProvider, AIResponse } from './types'
import {
  IdeaGenerationInput,
  IdeaGenerationOutput,
  ContentGenerationInput,
  ContentGenerationOutput,
  ContentImprovementInput,
  ContentImprovementOutput,
  ContentReviewInput,
  ContentReviewOutput,
  PerformanceAnalysisInput,
  PerformanceAnalysisOutput,
  RecommendationInput,
  RecommendationOutput,
} from './types'

const MOCK_DELAY_MS = 800

function delay(ms: number = MOCK_DELAY_MS): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const pillarContentMap: Record<string, { topics: string[]; keywords: string[] }> = {
  'Keselamatan Listrik': {
    topics: ['Instalasi rumah', 'Korsleting', 'Main listrik', 'ACDC safety'],
    keywords: ['aman', 'bahaya', 'hati-hati', 'standar', 'SPLN']
  },
  'Informasi Layanan': {
    topics: ['Pembayaran', 'Pengaduan', 'Layanan baru', 'Informasi tarif'],
    keywords: ['mudah', 'cepat', 'praktis', 'online', 'mobile']
  },
  'Kegiatan Perusahaan': {
    topics: ['Event', 'Audit', 'Prestasi', 'Inovasi'],
    keywords: ['berhasil', 'pencapaian', 'kolaborasi', 'tim']
  },
  'Hari Besar Nasional': {
    topics: ['Kemerdekaan', 'Pendidikan', 'Kesehatan', 'Lingkungan'],
    keywords: ['nasional', 'bangsa', 'indonesia', 'bersatu']
  },
  'Tips Kelistrikan': {
    topics: ['Hemat energi', 'Perawatan', 'Efisiensi', 'DIY'],
    keywords: ['hemat', 'praktis', 'tips', 'trik', 'mudah']
  },
  'Program Sosial': {
    topics: ['CSR', 'Bantuan', 'Pendidikan', 'Lingkungan'],
    keywords: ['peduli', 'bantu', 'dukung', 'bersama']
  }
}

const platformContentMap: Record<string, { format: string[]; style: string }> = {
  'Instagram': { format: ['Carousel', 'Reels', 'Story', 'Image Post'], style: 'visual dan engaging' },
  'TikTok': { format: ['Short Video'], style: 'fun, trending, dan cepat' },
  'Facebook': { format: ['Image Post', 'Long Video', 'Thread'], style: 'informatif dan storytelling' },
  'YouTube': { format: ['Long Video', 'Short Video'], style: 'edukatif dan detail' },
  'Twitter/X': { format: ['Thread', 'Image Post'], style: 'singkat dan aktual' },
  'LinkedIn': { format: ['Article', 'Image Post'], style: 'profesional dan industri' },
  'Website': { format: ['Article', 'Infographic'], style: 'formal dan komprehensif' }
}

export class MockAIProvider implements AIProvider {
  private modelUsed = 'MOCK'

  async generateIdeas(input: IdeaGenerationInput): Promise<AIResponse<IdeaGenerationOutput>> {
    await delay(1000)

    const pillarData = pillarContentMap[input.pillar] || pillarContentMap['Tips Kelistrikan']
    const platformData = platformContentMap[input.platform] || platformContentMap['Instagram']
    
    const count = input.count || 5
    const ideas = []

    for (let i = 0; i < count; i++) {
      const topic = pillarData.topics[i % pillarData.topics.length]
      const keyword = pillarData.keywords[i % pillarData.keywords.length]
      
      ideas.push({
        title: `${topic} ${input.pillar} - Tips ${keyword.toUpperCase()}`,
        description: `Konten edukatif tentang ${topic.toLowerCase()} yang ${platformData.style}. Cocok untuk ${input.targetAudience || 'masyarakat umum'} yang ingin memahami lebih dalam tentang ${keyword}.`,
        targetAudience: input.targetAudience || 'Masyarakat umum usia 25-45 tahun',
        suggestedFormat: platformData.format[i % platformData.format.length],
        reason: `Topik ${topic} relevan dengan pillar ${input.pillar} dan memiliki potensi engagement tinggi di ${input.platform}`
      })
    }

    return {
      success: true,
      data: { ideas },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }

  async generateContent(input: ContentGenerationInput): Promise<AIResponse<ContentGenerationOutput>> {
    await delay(1500)

    const pillarData = pillarContentMap[input.pillar] || pillarContentMap['Tips Kelistrikan']
    
    const hooks = [
      'Masih borong listrik tiap bulan?',
      'Cara ini bisa hemat 30% tagihan!',
      'Rahasia hemat listrik yang jarang diketahui',
      'Stop! Jangan biarkan listrik terbuang sia-sia'
    ]

    const ctas = [
      'Simpan post ini untuk referensi!',
      'Share ke keluarga biar hemat bareng!',
      'Klik link di bio untuk info lebih lanjut',
      'Comment "HEMAT" untuk tips tambahan!'
    ]

    return {
      success: true,
      data: {
        title: `${input.topic} - ${input.pillar}`,
        hook: hooks[Math.floor(Math.random() * hooks.length)],
        brief: `Konten ${input.format} tentang ${input.topic} dengan pendekatan ${input.tone || 'edukatif'} untuk ${input.targetAudience || 'masyarakat umum'}. Fokus pada value dan informasi bermanfaat.`,
        caption: `💡 ${input.topic}\n\n${Array(3).fill(0).map(() => pillarData.keywords[Math.floor(Math.random() * pillarData.keywords.length)]).join(' • ')}\n\nYuk simak tips lengkapnya!\n\n#${input.pillar.replace(/\s+/g, '')} #PLN #ListrikCerdas`,
        cta: ctas[Math.floor(Math.random() * ctas.length)],
        hashtags: [`#${input.pillar.replace(/\s+/g, '')}`, '#PLN', '#ListrikCerdas', '#HematEnergi', '#TipsListrik']
      },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }

  async improveContent(input: ContentImprovementInput): Promise<AIResponse<ContentImprovementOutput>> {
    await delay(1200)

    const improvements: string[] = []
    const suggestions: string[] = []

    const original = input.originalContent
    const wordCount = original.trim().split(/\s+/).length
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(original)
    const hasQuestion = original.includes('?')
    const hasCta = /(simpan|share|klik|download|daftar|comment|hubungi|cek|kunjungi|swipe)/i.test(original)
    const hasNumbers = /\d/.test(original)

    if (input.improvementType === 'all' || input.improvementType === 'engagement') {
      if (!hasQuestion) {
        suggestions.push('Tambahkan pertanyaan retoris di awal untuk hook yang lebih engaging')
        improvements.push('Hook engagement ditambahkan di paragraf pembuka')
      }
      if (!hasEmoji) {
        suggestions.push('Gunakan emoji secukupnya untuk memecah teks dan menarik perhatian')
        improvements.push('Emoji ditambahkan untuk visual appeal')
      }
    }

    if (input.improvementType === 'all' || input.improvementType === 'clarity') {
      if (wordCount > 50 && !original.includes('•') && !original.includes('\n-')) {
        suggestions.push('Pecah teks panjang menjadi poin-poin agar mudah dipindai')
        improvements.push('Struktur dirapikan menjadi bullet points')
      }
      if (!hasNumbers) {
        suggestions.push('Gunakan angka atau statistik untuk memperkuat klaim')
        improvements.push('Angka ditambahkan pada bagian penting')
      }
    }

    if (input.improvementType === 'all' || input.improvementType === 'tone') {
      suggestions.push(`Sesuaikan tone dengan karakter platform ${input.platform || 'media sosial'}`)
      improvements.push('Tone disesuaikan dengan gaya bahasa platform target')
    }

    if (input.improvementType === 'all' || input.improvementType === 'cta') {
      if (!hasCta) {
        suggestions.push('Tambahkan CTA yang jelas dan actionable di akhir konten')
        improvements.push('CTA ditambahkan: "Simpan post ini dan share ke yang butuh!"')
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Konten sudah baik — pertahankan struktur dan konsistensi tone')
      improvements.push('Tidak ada perubahan besar yang diperlukan')
    }

    let improved = original
    if (!hasQuestion && (input.improvementType === 'all' || input.improvementType === 'engagement')) {
      improved = `Tahukah kamu? ${improved}`
    }
    if (!hasCta && (input.improvementType === 'all' || input.improvementType === 'cta')) {
      improved = `${improved}\n\nSimpan post ini dan share ke yang butuh!`
    }
    if (improved === original) {
      improved = `${original}\n\n✨ (Dioptimalkan untuk ${input.platform || 'media sosial'})`
    }

    return {
      success: true,
      data: {
        originalContent: input.originalContent,
        improvedContent: improved,
        suggestions,
        improvements
      },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }

  async reviewContent(input: ContentReviewInput): Promise<AIResponse<ContentReviewOutput>> {
    await delay(1800)

    const original = input.content
    const wordCount = original.trim().split(/\s+/).length
    const hasQuestion = original.includes('?')
    const hasCta = /(simpan|share|klik|download|daftar|comment|hubungi|cek|kunjungi|swipe)/i.test(original)
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(original)
    const hasNumbers = /\d/.test(original)

    const clarityScore = wordCount > 150 ? 62 : wordCount < 5 ? 55 : 82
    const toneScore = 78 + (hasEmoji ? 6 : 0)
    const audienceScore = input.targetAudience ? 80 : 68
    const ctaScore = hasCta ? 85 : 55
    const engagementScore = (hasQuestion ? 78 : 62) + (hasNumbers ? 6 : 0)

    const overallScore = Math.round(
      (clarityScore + toneScore + audienceScore + ctaScore + engagementScore) / 5
    )

    const status = (score: number): 'good' | 'needs_improvement' | 'poor' =>
      score >= 75 ? 'good' : score >= 55 ? 'needs_improvement' : 'poor'

    const potentialIssues: string[] = []
    if (!hasCta) potentialIssues.push('Tidak ada CTA yang jelas — audiens tidak tahu langkah selanjutnya')
    if (!hasQuestion) potentialIssues.push('Hook pembuka kurang menarik perhatian')
    if (wordCount > 150) potentialIssues.push('Teks terlalu panjang untuk media sosial (idealnya < 150 kata)')
    if (!hasNumbers) potentialIssues.push('Klaim belum didukung angka atau data')

    const suggestions: string[] = []
    if (!hasCta) suggestions.push('Tambahkan CTA spesifik di akhir (mis. "Simpan post ini!")')
    if (!hasQuestion) suggestions.push('Buka dengan pertanyaan atau fakta mengejutkan')
    if (wordCount > 150) suggestions.push('Ringkas menjadi poin-poin utama')
    if (!hasNumbers) suggestions.push('Sertakan statistik atau angka pendukung')
    if (suggestions.length === 0) suggestions.push('Konten sudah memenuhi kualitas dasar — pertahankan')

    return {
      success: true,
      data: {
        overallScore,
        categories: [
          {
            name: 'Kejelasan Pesan',
            score: clarityScore,
            status: status(clarityScore),
            feedback:
              clarityScore >= 75
                ? 'Pesan utama tersampaikan dengan baik dan mudah dipahami'
                : wordCount > 150
                  ? 'Konten terlalu panjang — pesan utama tenggelam'
                  : 'Konten terlalu pendek — pesan belum berkembang',
          },
          {
            name: 'Tone & Bahasa',
            score: toneScore,
            status: status(toneScore),
            feedback: `Tone ${toneScore >= 75 ? 'sesuai' : 'kurang sesuai'} untuk platform ${input.platform}`,
          },
          {
            name: 'Relevansi Audiens',
            score: audienceScore,
            status: status(audienceScore),
            feedback: input.targetAudience
              ? `Konten relevan untuk ${input.targetAudience}`
              : 'Target audiens belum didefinisikan — sulit menilai relevansi',
          },
          {
            name: 'CTA',
            score: ctaScore,
            status: status(ctaScore),
            feedback: hasCta
              ? 'CTA ditemukan dan cukup actionable'
              : 'Tidak ada CTA — tambahkan ajakan yang jelas',
          },
          {
            name: 'Engagement Potential',
            score: engagementScore,
            status: status(engagementScore),
            feedback: hasQuestion
              ? 'Pertanyaan ditemukan — baik untuk mendorong interaksi'
              : 'Tambahkan elemen interaktif (pertanyaan/polling) untuk boost engagement',
          },
        ],
        potentialIssues,
        suggestions,
      },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }

  async analyzePerformance(input: PerformanceAnalysisInput): Promise<AIResponse<PerformanceAnalysisOutput>> {
    await delay(1500)

    const { data } = input

    return {
      success: true,
      data: {
        summary: `Periode ${data.dateRange.start} - ${data.dateRange.end}: Total ${data.totalViews.toLocaleString()} views dengan engagement rate rata-rata ${(data.avgEngagementRate * 100).toFixed(2)}%. ${data.totalViews > 50000 ? 'Performa sangat baik!' : 'Performa baik dengan ruang peningkatan.'}`,
        keyFindings: [
          `Total reach: ${data.totalViews.toLocaleString()} views dengan engagement rate ${(data.avgEngagementRate * 100).toFixed(1)}%`,
          'Konten format video pendek memiliki engagement tertinggi',
          'Carousel edukasi mendapat saves terbanyak',
          'Posting waktu prime time (18:00-20:00) performanya lebih baik'
        ],
        possibleReasons: [
          'Video pendek cocok dengan preferensi audience mobile-first',
          'Konten edukasi memberikan value nyata sehingga disimpan',
          'Timing posting mempengaruhi reach organik'
        ],
        recommendedActions: [
          'Perbanyak konten video format pendek (Reels/TikTok)',
          'Buat lebih banyak carousel edukasi dengan tips praktis',
          'Jadwalkan posting di jam prime time',
          'Eksperimen dengan konten di balik layar untuk humanisasi brand'
        ],
        opportunities: [
          'Potensi konten series atau campaign berkelanjutan',
          'Kolaborasi dengan KOL untuk expand reach',
          'User-generated content untuk testimonial'
        ]
      },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateRecommendations(_input: RecommendationInput): Promise<AIResponse<RecommendationOutput>> {
    await delay(2000)

    const recommendations = [
      {
        title: 'Series Tips Hemat Listrik Bulanan',
        reason: 'Berdasarkan performa konten "Tips Hemat Listrik" yang mendapat engagement tinggi, series berkala dapat membangun konsistensi dan ekspektasi audience',
        suggestedPillar: 'Tips Kelistrikan',
        suggestedFormat: 'Carousel',
        suggestedPlatform: 'Instagram',
        expectedObjective: 'Meningkatkan engagement rate dan follower retention',
        confidence: 0.85
      },
      {
        title: 'Behind the Scenes Tim PLN',
        reason: 'Konten human interest dan BTS memiliki potensi viral karena menunjukkan sisi personal brand',
        suggestedPillar: 'Kegiatan Perusahaan',
        suggestedFormat: 'Short Video',
        suggestedPlatform: 'TikTok',
        expectedObjective: 'Humanisasi brand dan increase reach',
        confidence: 0.78
      },
      {
        title: 'Q&A Session: Konsultasi Listrik Gratis',
        reason: 'Interactive content seperti Q&A memiliki engagement rate tinggi dan membangun relationship dengan audience',
        suggestedPillar: 'Informasi Layanan',
        suggestedFormat: 'Story',
        suggestedPlatform: 'Instagram',
        expectedObjective: 'Meningkatkan engagement dan customer satisfaction',
        confidence: 0.82
      },
      {
        title: 'Infografis Data Energi Terbarukan Indonesia',
        reason: 'Data visualization content memiliki shareability tinggi dan positioning sebagai thought leader',
        suggestedPillar: 'Kegiatan Perusahaan',
        suggestedFormat: 'Infographic',
        suggestedPlatform: 'LinkedIn',
        expectedObjective: 'Positioning sebagai industri leader dan B2B engagement',
        confidence: 0.75
      }
    ]

    return {
      success: true,
      data: { recommendations },
      generatedAt: new Date(),
      modelUsed: this.modelUsed
    }
  }
}

// Factory function to get the AI provider
// TODO: Replace MockAIProvider with GeminiAIProvider when integrating Gemini API
export function getAIProvider(): AIProvider {
  return new MockAIProvider()
}
