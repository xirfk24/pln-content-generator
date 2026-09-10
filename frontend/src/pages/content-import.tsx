'use client'

import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'
import { CONTENT_FORMATS, CONTENT_PURPOSES, POSTING_CATEGORIES } from '@/constants'

// RFC 4180-compliant CSV parser (handles quoted fields with commas and newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let inQuote = false
    let cur = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

const TEMPLATE_HEADERS = [
  'Title',
  'Topic',
  'Planned Date (YYYY-MM-DD)',
  'Platform',
  'Format',
  'Category',
  'Tema',
  'Content Purpose',
  'Posting Category',
  'PIC',
  'Brief',
  'Reference',
]

const TEMPLATE_EXAMPLE = [
  'Contoh Judul Konten',
  'PLN Mobile',
  '2026-09-15',
  'Instagram',
  'Carousel',
  '',
  '',
  'EDUCATION',
  'ORIGINAL',
  'Tim Digital',
  'Brief singkat di sini',
  '',
]

function downloadTemplate() {
  const bom = '\uFEFF'
  const rows = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]
  const csv = rows
    .map((r) => r.map((v) => (v.includes(',') ? `"${v}"` : v)).join(','))
    .join('\r\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template-import-konten.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface PreviewRow {
  rowNum: number
  title: string
  topic: string
  planned_date: string
  platform: string
  format: string
  content_purpose: string
  posting_category: string
  pic: string
}

interface ImportError {
  row: number
  field: string
  message: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: ImportError[]
}

export default function ContentImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setParseError(null)
    setPreview([])
    setRawRows([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)

      if (rows.length < 2) {
        setParseError('File tidak memiliki data — butuh minimal 1 baris header + 1 baris data.')
        return
      }

      const header = rows[0].map((h) => h.toLowerCase().replace(/\s*\(.*\)/, '').trim())
      if (!header.includes('title') || !header.includes('topic')) {
        setParseError(
          'Header tidak sesuai. Pastikan kolom Title dan Topic ada, atau gunakan template yang disediakan.'
        )
        return
      }

      const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ''))
      setRawRows(dataRows)
      setPreview(
        dataRows.slice(0, 10).map((r, i) => ({
          rowNum: i + 2,
          title: r[0] ?? '',
          topic: r[1] ?? '',
          planned_date: r[2] ?? '',
          platform: r[3] ?? '',
          format: r[4] ?? '',
          content_purpose: r[7] ?? '',
          posting_category: r[8] ?? '',
          pic: r[9] ?? '',
        }))
      )
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function handleImport() {
    if (rawRows.length === 0) return
    setImporting(true)
    setResult(null)

    const rows = rawRows.map((r) => ({
      title: r[0] ?? '',
      topic: r[1] ?? '',
      planned_date: r[2] ?? '',
      platform: r[3] ?? '',
      format: r[4] ?? '',
      category: r[5] ?? '',
      tema: r[6] ?? '',
      content_purpose: r[7] ?? '',
      posting_category: r[8] ?? '',
      pic: r[9] ?? '',
      brief: r[10] ?? '',
      reference: r[11] ?? '',
    }))

    try {
      const res = await apiFetch('/api/contents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error ?? 'Import gagal — coba lagi.')
      } else {
        setResult(data as ImportResult)
      }
    } catch {
      setParseError('Terjadi error jaringan saat mengimpor. Coba lagi.')
    } finally {
      setImporting(false)
    }
  }

  function resetImport() {
    setFile(null)
    setPreview([])
    setRawRows([])
    setResult(null)
    setParseError(null)
  }

  const failedErrors = result?.errors.filter((e) => !e.message.startsWith('Duplikat')) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Import Konten</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Upload file CSV untuk mengimpor rencana konten secara massal
        </p>
      </div>

      {/* Step 1 — Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Download Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template CSV
          </Button>

          <div className="rounded-lg bg-surface-muted p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium text-ink-secondary">
              <Info className="h-4 w-4" />
              Catatan pengisian
            </div>
            <ul className="space-y-1 text-ink-muted">
              <li>• <strong>Title</strong> dan <strong>Topic</strong> wajib diisi.</li>
              <li>• <strong>Planned Date</strong>: format YYYY-MM-DD (contoh: 2026-09-15).</li>
              <li>• <strong>Format</strong> (opsional, default Carousel): {CONTENT_FORMATS.join(', ')}.</li>
              <li>• <strong>Content Purpose</strong> (opsional): {CONTENT_PURPOSES.join(', ')}.</li>
              <li>• <strong>Posting Category</strong> (opsional): {POSTING_CATEGORIES.join(', ')}.</li>
              <li>• <strong>Platform, Category, Tema</strong>: harus sesuai nama yang terdaftar di sistem (case-insensitive).</li>
              <li>• Baris dengan <strong>Title + Planned Date</strong> yang sama dengan konten existing akan dilewati (duplikat).</li>
              <li>• Maksimal <strong>500 baris</strong> per upload.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Upload File CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/20">
            <Upload className="h-8 w-8 text-ink-muted" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-ink">
                {file ? file.name : 'Klik atau seret file CSV ke sini'}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">Format: .csv (buka/buat dari Excel, simpan sebagai CSV)</p>
            </div>
            <input type="file" accept=".csv" className="sr-only" onChange={handleFile} />
          </label>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{parseError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3 — Preview */}
      {preview.length > 0 && !result && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                3. Preview &amp; Konfirmasi ({rawRows.length} baris ditemukan)
              </CardTitle>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {importing ? 'Mengimpor...' : `Import ${rawRows.length} Baris`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rawRows.length > 10 && (
              <p className="mb-3 text-xs text-ink-muted">
                Menampilkan 10 baris pertama untuk preview. Semua {rawRows.length} baris akan diimpor.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-surface-muted">
                  <tr>
                    {['#', 'Title', 'Topic', 'Tanggal', 'Platform', 'Format', 'Purpose', 'PIC'].map(
                      (h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row) => (
                    <tr key={row.rowNum} className="hover:bg-surface-muted/60">
                      <td className="px-3 py-2 text-ink-muted">{row.rowNum}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.title || (
                          <span className="text-danger italic">kosong</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-ink-secondary">{row.topic || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">{row.planned_date || '-'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.platform || '-'}</Badge>
                      </td>
                      <td className="px-3 py-2 text-ink-secondary">{row.format || 'Carousel'}</td>
                      <td className="px-3 py-2 text-ink-secondary">{row.content_purpose || '-'}</td>
                      <td className="px-3 py-2 text-ink-secondary">{row.pic || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
                <span className="font-medium text-success">{result.imported} berhasil diimpor</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
                  <span className="font-medium text-warning">{result.skipped} duplikat dilewati</span>
                </div>
              )}
              {failedErrors.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-danger" aria-hidden="true" />
                  <span className="font-medium text-danger">{failedErrors.length} baris gagal</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-danger-border">
                <div className="bg-danger-soft px-4 py-2 text-xs font-semibold uppercase tracking-wider text-danger">
                  Detail Error / Duplikat
                </div>
                <div className="max-h-64 divide-y overflow-y-auto">
                  {result.errors.map((e, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-4 py-2 text-sm">
                      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink-secondary">
                        Baris {e.row}
                      </span>
                      <span className="shrink-0 text-ink-muted">[{e.field}]</span>
                      <span className={e.message.startsWith('Duplikat') ? 'text-warning' : 'text-danger'}>
                        {e.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetImport}>
                Import File Lain
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/content/planning'}>
                Lihat Content Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
