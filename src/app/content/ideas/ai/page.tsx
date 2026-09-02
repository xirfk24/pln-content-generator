'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2, Sparkles, Copy, Check, ArrowRight } from 'lucide-react'
import { getAIProvider } from '@/lib/ai'

export default function AIIdeaGeneratorPage() {
  const [pillars, setPillars] = useState<{id: string; name: string}[]>([])
  const [platforms, setPlatforms] = useState<{id: string; name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedIdeas, setGeneratedIdeas] = useState<Array<{
    title: string
    description: string
    targetAudience: string
    suggestedFormat: string
    reason: string
  }> | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({
    pillar: '',
    platform: '',
    targetAudience: '',
    objective: '',
    count: 5,
  })

  useEffect(() => {
    fetch('/api/master-data')
      .then(res => res.json())
      .then(data => {
        setPillars(data.pillars || [])
        setPlatforms(data.platforms || [])
      })
      .catch(console.error)
  }, [])

  async function handleGenerate() {
    if (!form.pillar || !form.platform) return

    setLoading(true)
    setGeneratedIdeas(null)

    try {
      const ai = getAIProvider()
      const result = await ai.generateIdeas({
        pillar: pillars.find(p => p.id === form.pillar)?.name || form.pillar,
        platform: platforms.find(p => p.id === form.platform)?.name || form.platform,
        targetAudience: form.targetAudience,
        objective: form.objective,
        count: form.count,
      })

      if (result.success && result.data) {
        setGeneratedIdeas(result.data.ideas)
      }
    } catch (error) {
      console.error('Failed to generate ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUseIdea(idea: {
    title: string
    description: string
    targetAudience: string
    suggestedFormat: string
  }) {
    try {
      const res = await fetch('/api/content-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          pillar_id: form.pillar,
          target_audience: idea.targetAudience,
          source: 'AI Generated',
          notes: `Suggested format: ${idea.suggestedFormat}`,
        }),
      })

      if (res.ok) {
        alert('Idea saved successfully!')
      }
    } catch (error) {
      console.error('Failed to save idea:', error)
    }
  }

  async function handleConvertToContent(idea: {
    title: string
    description: string
    targetAudience: string
    suggestedFormat: string
  }) {
    try {
      const res = await fetch('/api/content-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          pillar_id: form.pillar,
          target_audience: idea.targetAudience,
          source: 'AI Generated',
          notes: `Suggested format: ${idea.suggestedFormat}`,
          auto_convert: true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.contentId) {
          window.location.href = `/content/${data.contentId}`
        }
      }
    } catch (error) {
      console.error('Failed:', error)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          AI Idea Generator
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">Generate content ideas using AI — Demo Mode</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pillar *</Label>
              <Select
                value={form.pillar}
                onChange={(e) => setForm({ ...form, pillar: e.target.value })}
                className="w-full"
              >
                <option value="">Select pillar</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Platform *</Label>
              <Select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full"
              >
                <option value="">Select platform</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="e.g., Masyarakat usia 25-45 tahun"
              />
            </div>

            <div className="space-y-2">
              <Label>Objective</Label>
              <Input
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                placeholder="e.g., Edukasi, Awareness"
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Ideas</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !form.pillar || !form.platform}
              className="w-full md:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Ideas
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedIdeas && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Ideas</h2>
          
          {generatedIdeas.map((idea, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-ink">{idea.title}</h3>
                    <Badge variant="outline">{idea.suggestedFormat}</Badge>
                  </div>
                  
                  <p className="text-sm text-ink-secondary">{idea.description}</p>
                  
                  <div className="text-xs text-ink-secondary">
                    <p><strong>Target:</strong> {idea.targetAudience}</p>
                    <p><strong>Reason:</strong> {idea.reason}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUseIdea(idea)}>
                      Save as Draft
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleConvertToContent(idea)}>
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Create Content
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(idea.description, `idea-${index}`)}
                    >
                      {copied === `idea-${index}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
