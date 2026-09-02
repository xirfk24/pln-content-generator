export { type AIProvider, type AIResponse } from './types'
export type {
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

export { MockAIProvider, getAIProvider } from './mock-provider'

// TODO: Replace MockAIProvider with GeminiAIProvider
// Example integration:
// import { GeminiAIProvider } from './gemini-provider'
// export function getAIProvider(): AIProvider {
//   return new GeminiAIProvider(process.env.GEMINI_API_KEY!)
// }
