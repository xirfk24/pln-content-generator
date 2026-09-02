'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { AIResultCard, AIError } from '@/components/ai/ai-result-card'

interface ReviewCategory {
  name: string
  score: number
  status: 'good' | 'needs_improvement' | 'poor'
  feedback: string
}

interface ReviewResult {
  overallScore: number
  categories: ReviewCategory[]
  potentialIssues: string[]
  suggestions: string[]
}

const STATUS_STYLE: Record<string, string> = {
  good: 'bg-success-soft text-success',
  needs_improvement: 'bg-warning-soft text-warning',
  poor: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<string, string> = {
  good: 'Good',
  needs_improvement: 'Needs Improvement',
  poor: 'Poor',
}

export function AIReviewPanel({
  content,
  platform,
  targetAudience,
}: {
  content: string
  platform: string
  targetAudience?: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  async function runReview() {
    if (!content.trim()) {
      setError('Content brief is empty — write something first.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/review-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          targetAudience,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'AI review failed')
        return
      }

      setResult(data.result)
      setGeneratedAt(data.generatedAt)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-secondary">
          Run a quality check before submitting. Advisory only — does not affect
          approval.
        </p>
        <Button size="sm" variant="outline" onClick={runReview} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          AI Review
        </Button>
      </div>

      {error && <AIError message={error} />}

      {result && (
        <AIResultCard
          title="AI Content Review"
          generatedAt={generatedAt}
          onRegenerate={runReview}
          onDismiss={() => setResult(null)}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-14 w-14 flex-col items-center justify-center rounded-full ${
                result.overallScore >= 75
                  ? 'bg-success-soft text-success'
                  : result.overallScore >= 55
                    ? 'bg-warning-soft text-warning'
                    : 'bg-danger-soft text-danger'
              }`}
            >
              <span className="text-lg font-bold">{result.overallScore}</span>
              <span className="text-[10px]">/100</span>
            </div>
            <div>
              <p className="font-medium">Overall Score</p>
              <p className="text-xs text-ink-secondary">
                {result.overallScore >= 75
                  ? 'Kualitas baik — siap diajukan'
                  : result.overallScore >= 55
                    ? 'Cukup — perlu beberapa perbaikan'
                    : 'Perlu perbaikan sebelum submit'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {result.categories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-start justify-between gap-2 rounded-md bg-white p-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-ink-secondary">{cat.feedback}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[cat.status]}`}
                >
                  {STATUS_LABEL[cat.status]} ({cat.score})
                </span>
              </div>
            ))}
          </div>

          {result.potentialIssues.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">Potential Issues</p>
              <ul className="mt-1 list-inside list-disc text-xs text-ink-secondary">
                {result.potentialIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">Suggestions</p>
              <ul className="mt-1 list-inside list-disc text-xs text-ink-secondary">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </AIResultCard>
      )}
    </div>
  )
}
