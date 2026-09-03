import type { CSSProperties } from 'react'

/**
 * Shared chart tokens — keep in sync with design tokens in globals.css.
 * Charts cannot consume CSS variables reliably (canvas/SVG rendering,
 * gradient stops, etc.) so hex values are mirrored here.
 */
export const CHART_COLORS = {
  primary: '#2563eb',
  primarySoft: '#dbeafe',
  success: '#059669',
  successSoft: '#d1fae5',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  info: '#0284c7',
  infoSoft: '#e0f2fe',
  violet: '#7c3aed',
  teal: '#0e7490',
  lime: '#4d7c0f',
  orange: '#c2410c',
  neutral: '#9ca3af',
  neutralStrong: '#4b5563',
} as const

/** Ordered categorical palette for >3 series (status breakdown etc.) */
export const CATEGORY_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.success,
  CHART_COLORS.info,
  CHART_COLORS.violet,
  CHART_COLORS.teal,
  CHART_COLORS.lime,
  CHART_COLORS.orange,
  CHART_COLORS.neutralStrong,
] as const

/** Shared axis/label styling so every chart reads at the same size */
export const AXIS_PROPS = {
  tick: { fontSize: 12, fill: '#4b5563' },
  axisLine: { stroke: '#e5e7eb' },
  tickLine: false as const,
} as const

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',
  vertical: false as const,
} as const

const tooltipStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px -2px rgb(17 24 39 / 0.08)',
  fontSize: '13px',
  padding: '8px 12px',
}

interface TooltipEntry {
  name?: unknown
  value?: unknown
  color?: string
}

/** Shared Recharts Tooltip content — consistent formatting across charts */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: unknown
  formatter?: (value: number | string, name?: string) => string
}) {
  if (!active || !payload || payload.length === 0) return null

  const labelStr = label != null && label !== '' ? String(label) : null

  return (
    <div style={tooltipStyle} className="space-y-1">
      {labelStr && (
        <p className="text-xs font-semibold" style={{ color: '#111827' }}>
          {labelStr}
        </p>
      )}
      {payload.map((item, i) => {
        const raw = item.value
        const name = item.name != null ? String(item.name) : undefined
        const display =
          Array.isArray(raw)
            ? raw.map(String).join(' / ')
            : typeof raw === 'number' || typeof raw === 'string'
              ? formatter
                ? formatter(raw, name)
                : String(raw)
              : String(raw)
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs" style={{ color: '#4b5563' }}>
              {name}:
            </span>
            <span className="text-xs font-semibold" style={{ color: '#111827' }}>
              {display}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function formatNumber(value: number | string): string {
  return Number(value).toLocaleString('id-ID')
}

export function formatPercent(value: number | string): string {
  return `${Number(value).toFixed(2)}%`
}
