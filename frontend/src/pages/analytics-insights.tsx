'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { AIResultCard, AIError } from '@/components/ai/ai-result-card'

interface AnalysisResult {
  summary: string
  keyFindings: string[]
  possibleReasons: string[]
  recommendedActions: string[]
  opportunities: string[]
}

interface InsightSection {
  title: string
  items: string[]
  accent: string
}

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS)
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((r) => r.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  async function runAnalysis() {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch('/api/ai/analyze-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'AI analysis failed')
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

  const sections: InsightSection[] = result
    ? [
        { title: 'Possible Reasons', items: result.possibleReasons, accent: 'border-warning-border bg-warning-soft' },
        { title: 'Recommended Actions', items: result.recommendedActions, accent: 'border-success-border bg-success-soft' },
        { title: 'Opportunities', items: result.opportunities, accent: 'border-info-border bg-info-soft' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">AI Insights</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          AI analysis of your content performance — Demo Mode
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              masterData={masterData}
              showStatus={false}
            />
            <div>
              <Button onClick={runAnalysis} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <AIError message={error} />}

      {loading && (
        <Card>
          <CardContent className="py-10">
            <div className="mx-auto max-w-md space-y-2 text-center text-sm text-ink-secondary">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p>Analyzing topic...</p>
              <p className="text-xs">Aggregating performance data...</p>
              <p className="text-xs">Generating insights...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <AIResultCard
            title="AI Performance Analysis"
            generatedAt={generatedAt}
            onRegenerate={runAnalysis}
            onDismiss={() => setResult(null)}
          >
            <div>
              <p className="text-sm font-medium text-ink-secondary">Performance Summary</p>
              <p className="mt-1 text-sm text-ink">{result.summary}</p>
            </div>
          </AIResultCard>

          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-sm font-medium text-ink-secondary">Key Findings</p>
              <ul className="space-y-2">
                {result.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {finding}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {sections.map((section) =>
            section.items.length > 0 ? (
              <div key={section.title} className={`rounded-lg border p-4 ${section.accent}`}>
                <p className="mb-2 text-sm font-medium text-ink">{section.title}</p>
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink-muted/40" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
