'use client'

import { Button } from '@/components/ui/button'
import { Copy, Check, RefreshCw, X, Bot } from 'lucide-react'
import { useState } from 'react'

interface AIResultCardProps {
  title: string
  generatedAt: string | Date | null
  onRegenerate?: () => void
  onDismiss?: () => void
  children: React.ReactNode
}

export function AIResultCard({
  title,
  generatedAt,
  onRegenerate,
  onDismiss,
  children,
}: AIResultCardProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const el = document.querySelector('[data-ai-result-content]')
    if (el?.textContent) {
      navigator.clipboard.writeText(el.textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const timeLabel = generatedAt
    ? new Date(generatedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="rounded-lg border border-primary-border bg-primary-soft">
      <div className="flex items-center justify-between border-b border-primary-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="rounded bg-neutral-border px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-secondary">
            Demo Mode
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <Button variant="ghost" size="icon" onClick={onRegenerate} title="Regenerate">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy">
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss} title="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {timeLabel && (
        <p className="px-4 pt-2 text-xs text-ink-muted">Generated at {timeLabel}</p>
      )}

      <div data-ai-result-content className="px-4 pb-4 pt-2">
        {children}
      </div>
    </div>
  )
}

export function AIError({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">
      {message}
    </div>
  )
}
