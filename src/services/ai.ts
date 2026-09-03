'use server'

export interface AIdeaGenerationInput {
  pillar: string
  platform: string
  targetAudience?: string
  objective?: string
  count?: number
}

export async function generateIdeas(input: AIdeaGenerationInput) {
  const { getAIProvider } = await import('@/lib/ai')
  const ai = getAIProvider()
  
  return ai.generateIdeas({
    pillar: input.pillar,
    platform: input.platform,
    targetAudience: input.targetAudience,
    objective: input.objective,
    count: input.count || 5,
  })
}

export async function generateContent(input: {
  topic: string
  pillar: string
  platform: string
  format: string
  targetAudience?: string
  tone?: string
}) {
  const { getAIProvider } = await import('@/lib/ai')
  const ai = getAIProvider()
  
  return ai.generateContent({
    topic: input.topic,
    pillar: input.pillar,
    platform: input.platform,
    format: input.format,
    targetAudience: input.targetAudience,
    tone: input.tone,
  })
}

export async function improveContent(input: {
  content: string
  improvementType: 'clarity' | 'engagement' | 'tone' | 'cta' | 'all'
  targetAudience?: string
  platform?: string
}) {
  const { getAIProvider } = await import('@/lib/ai')
  const ai = getAIProvider()
  
  return ai.improveContent({
    originalContent: input.content,
    improvementType: input.improvementType,
    targetAudience: input.targetAudience,
    platform: input.platform,
  })
}

export async function reviewContent(input: {
  content: string
  platform: string
  targetAudience?: string
}) {
  const { getAIProvider } = await import('@/lib/ai')
  const ai = getAIProvider()
  
  return ai.reviewContent({
    content: input.content,
    platform: input.platform,
    targetAudience: input.targetAudience,
  })
}
