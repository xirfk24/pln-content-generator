'use client'

import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, ArrowDownToLine } from 'lucide-react'
import { AIResultCard, AIError } from '@/components/ai/ai-result-card'
import { Select } from '@/components/ui/select'

interface ImproveResult {
  originalContent: string
  improvedContent: string
  suggestions: string[]
  improvements: string[]
}

type ImprovementType = 'clarity' | 'engagement' | 'tone' | 'cta' | 'all'

const TYPE_OPTIONS: Array<{ value: ImprovementType; label: string }> = [
  { value: 'all', label: 'All Aspects' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'clarity', label: 'Clarity' },
  { value: 'tone', label: 'Tone' },
  { value: 'cta', label: 'CTA' },
]

export function AIImprovePanel({
  content,
  platform,
  onApply,
}: {
  content: string
  platform: string
  onApply: (improved: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImproveResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [type, setType] = useState<ImprovementType>('all')

  async function runImprove() {
    if (!content.trim()) {
      setError('Content is empty — write something first.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch('/api/ai/improve-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          improvementType: type,
          platform,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'AI improvement failed')
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as ImprovementType)}
          className="w-40"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" onClick={runImprove} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Improve with AI
        </Button>
      </div>

      {error && <AIError message={error} />}

      {result && (
        <AIResultCard
          title="AI Content Improvement"
          generatedAt={generatedAt}
          onRegenerate={runImprove}
          onDismiss={() => setResult(null)}
        >
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-ink-secondary">Improved Content</p>
              <div className="whitespace-pre-wrap rounded-md bg-surface p-3 text-sm">
                {result.improvedContent}
              </div>
            </div>

            <Button size="sm" onClick={() => onApply(result.improvedContent)}>
              <ArrowDownToLine className="mr-1 h-3 w-3" />
              Apply to Brief
            </Button>

            {result.improvements.length > 0 && (
              <div>
                <p className="text-sm font-medium">What was improved</p>
                <ul className="mt-1 list-inside list-disc text-xs text-ink-secondary">
                  {result.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="mt-1 list-inside list-disc text-xs text-ink-secondary">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AIResultCard>
      )}
    </div>
  )
}
