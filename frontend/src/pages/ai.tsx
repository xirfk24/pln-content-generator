'use client'

import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import Link from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Wand2, ShieldCheck, BarChart3 } from 'lucide-react'
import { AIResultCard, AIError } from '@/components/ai/ai-result-card'

interface Recommendation {
  title: string
  reason: string
  suggestedPillar: string
  suggestedFormat: string
  suggestedPlatform: string
  expectedObjective: string
  confidence: number
}

const FEATURES = [
  {
    href: '/content/planning/new',
    icon: Wand2,
    title: 'Content Generator',
    description: 'Generate title, hook, brief, and caption for a plan',
  },
  {
    href: '/workflow/tasks',
    icon: ShieldCheck,
    title: 'AI Review',
    description: 'Quality check content before submitting for approval',
  },
  {
    href: '/analytics/insights',
    icon: BarChart3,
    title: 'Performance Analysis',
    description: 'AI insights from your analytics data',
  },
]

export default function AIAssistantPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  async function runRecommendations() {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch('/api/ai/recommendations', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'AI recommendation failed')
        return
      }

      setRecommendations(data.result.recommendations)
      setGeneratedAt(data.generatedAt)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          AI Assistant
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          AI Assistant — Demo Mode. Responses are simulated; no external AI
          service is connected.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <feature.icon className="mb-2 h-6 w-6 text-primary" />
                <p className="font-medium text-ink">{feature.title}</p>
                <p className="mt-1 text-xs text-ink-secondary">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>
            Analyze historical content performance and generate recommendations
            for new content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runRecommendations} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && <AIError message={error} />}

      {loading && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto max-w-md space-y-1 text-sm text-ink-secondary">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
              <p>Reading historical content...</p>
              <p className="text-xs">Identifying patterns...</p>
              <p className="text-xs">Generating recommendations...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations && !loading && (
        <AIResultCard
          title="AI Recommendations"
          generatedAt={generatedAt}
          onRegenerate={runRecommendations}
          onDismiss={() => setRecommendations(null)}
        >
          <div className="space-y-4">
            {recommendations.map((rec, index) => {
              return (
                <div key={index} className="rounded-lg border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink">{rec.title}</h3>
                    <Badge variant="info">
                      {Math.round(rec.confidence * 100)}% confidence
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-ink-secondary">{rec.reason}</p>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink-secondary md:grid-cols-3">
                    <div>
                      <span className="text-ink-muted">Pillar:</span>{' '}
                      <Badge variant="outline">{rec.suggestedPillar}</Badge>
                    </div>
                    <div>
                      <span className="text-ink-muted">Format:</span>{' '}
                      <Badge variant="outline">{rec.suggestedFormat}</Badge>
                    </div>
                    <div>
                      <span className="text-ink-muted">Platform:</span>{' '}
                      <Badge variant="outline">{rec.suggestedPlatform}</Badge>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-ink-secondary">
                    <span className="text-ink-muted">Objective:</span>{' '}
                    {rec.expectedObjective}
                  </p>
                </div>
              )
            })}
          </div>
        </AIResultCard>
      )}
    </div>
  )
}
