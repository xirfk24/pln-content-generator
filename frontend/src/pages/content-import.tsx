'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import Link from '@/compat/next'
import {
  downloadExcelTemplate,
  parseUploadedFile,
  downloadValidationReportExcel,
  type ParsedImportRow,
  type MasterDataInfo,
} from '@/lib/excel-template'

interface RowValidationResult {
  row_number: number
  title: string
  topic: string
  planned_date: string
  pillar: string
  platform: string
  status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING'
  errors: string[]
  warnings: string[]
  parsed_data?: any
}

interface ValidationSummary {
  total: number
  valid: number
  invalid: number
  duplicate: number
  warning: number
}

interface ImportExecutionResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; field: string; message: string }>
}

type StepperStep = 1 | 2 | 3 | 4 | 5

export default function ContentImportPage() {
  const [currentStep, setCurrentStep] = useState<StepperStep>(1)
  const [masterData, setMasterData] = useState<MasterDataInfo>({ pillars: [], platforms: [] })

  // Step 1: File Selection
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)

  // Step 2 & 3: Validation & Preview
  const [isValidating, setIsValidating] = useState(false)
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicate: 0,
    warning: 0,
  })
  const [validationRows, setValidationRows] = useState<RowValidationResult[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Step 4 & 5: Import Execution
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null)

  // Load master data on mount
  useEffect(() => {
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => {
        setMasterData({
          pillars: data.pillars || [],
          platforms: data.platforms || [],
          categories: data.categories || [],
        })
      })
      .catch((err) => console.error('Gagal memuat master data:', err))
  }, [])

  // Handle File Upload & Parse Client-side
  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setFileError(null)
    setIsReadingFile(true)

    try {
      const rows = await parseUploadedFile(selected)
      setParsedRows(rows)
    } catch (err: any) {
      console.error('Error parsing file:', err)
      setFileError(err.message || 'Gagal membaca isi file. Pastikan format sesuai template.')
      setParsedRows([])
    } finally {
      setIsReadingFile(false)
    }
  }

  // Handle Drag & Drop
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return

    setFile(dropped)
    setFileError(null)
    setIsReadingFile(true)

    parseUploadedFile(dropped)
      .then((rows) => setParsedRows(rows))
      .catch((err) => {
        setFileError(err.message || 'Gagal membaca isi file.')
        setParsedRows([])
      })
      .finally(() => setIsReadingFile(false))
  }

  // Trigger Validation on Backend
  async function handleStartValidation() {
    if (parsedRows.length === 0) {
      setFileError('Tidak ada baris data valid untuk divalidasi.')
      return
    }

    setCurrentStep(2)
    setIsValidating(true)
    setFileError(null)

    try {
      const res = await apiFetch('/api/contents/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      })

      const rawText = await res.text()
      let data: any
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error(
          res.status === 404
            ? 'Endpoint validasi tidak ditemukan (404). Silakan pastikan server backend berjalan.'
            : rawText || `Server error (${res.status})`
        )
      }

      if (!res.ok) {
        setFileError(data.error || 'Terjadi kesalahan saat memvalidasi data.')
        setCurrentStep(1)
        return
      }

      setValidationSummary(data.summary)
      setValidationRows(data.rows || [])
      setCurrentStep(3)
    } catch (err: any) {
      console.error('Validation error:', err)
      setFileError('Gagal memvalidasi data: ' + (err.message || err))
      setCurrentStep(1)
    } finally {
      setIsValidating(false)
    }
  }

  // Trigger Execution of Valid Data
  async function handleExecuteImport() {
    const validParsedData = validationRows
      .filter((r) => (r.status === 'VALID' || r.status === 'WARNING') && r.parsed_data)
      .map((r) => r.parsed_data)

    if (validParsedData.length === 0) {
      alert('Tidak ada data berstatus valid untuk diimport.')
      return
    }

    setIsImporting(true)
    try {
      const res = await apiFetch('/api/contents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validParsedData }),
      })

      const rawText = await res.text()
      let data: any
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error(rawText || `Server error (${res.status})`)
      }

      if (!res.ok) {
        alert(data.error || 'Gagal mengimpor data ke database.')
        return
      }

      setImportResult(data as ImportExecutionResult)
      setCurrentStep(5)
    } catch (err: any) {
      console.error('Import execution error:', err)
      alert('Terjadi kesalahan saat menyimpan data: ' + (err.message || err))
    } finally {
      setIsImporting(false)
    }
  }

  // Filter & Search in Preview Rows
  const filteredPreviewRows = useMemo(() => {
    let list = [...validationRows]

    // Filter status
    if (filterStatus === 'VALID') {
      list = list.filter((r) => r.status === 'VALID' || r.status === 'WARNING')
    } else if (filterStatus === 'INVALID') {
      list = list.filter((r) => r.status === 'INVALID')
    } else if (filterStatus === 'DUPLICATE') {
      list = list.filter((r) => r.status === 'DUPLICATE')
    } else if (filterStatus === 'WARNING') {
      list = list.filter((r) => r.status === 'WARNING')
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchTopic = r.topic.toLowerCase().includes(q)
        const matchPillar = r.pillar.toLowerCase().includes(q)
        const matchPlatform = r.platform.toLowerCase().includes(q)
        const matchRow = String(r.row_number).includes(q)
        const matchErrors = r.errors.some((e) => e.toLowerCase().includes(q))
        return matchTitle || matchTopic || matchPillar || matchPlatform || matchRow || matchErrors
      })
    }

    return list
  }, [validationRows, filterStatus, searchQuery])

  function handleResetAll() {
    setFile(null)
    setParsedRows([])
    setFileError(null)
    setValidationRows([])
    setValidationSummary({ total: 0, valid: 0, invalid: 0, duplicate: 0, warning: 0 })
    setImportResult(null)
    setFilterStatus('ALL')
    setSearchQuery('')
    setCurrentStep(1)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Import Rencana Konten Massal
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Impor batch rencana konten menggunakan template Excel resmi dengan validasi sebelum penyimpanan.
        </p>
      </div>

      {/* Stepper Wizard (5 Steps) */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Validasi' },
            { num: 3, label: 'Preview & Analisis' },
            { num: 4, label: 'Konfirmasi' },
            { num: 5, label: 'Hasil Import' },
          ].map((s) => {
            const isActive = currentStep === s.num
            const isCompleted = currentStep > s.num
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-primary ring-1 ring-primary/40 dark:bg-blue-950/40 dark:text-blue-300'
                    : isCompleted
                    ? 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-primary text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <span className="truncate">{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: UPLOAD FILE & DOWNLOAD TEMPLATE                   */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* Card 1: Download Template Excel 3 Sheet */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b bg-surface-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    1. Download Template Excel Resmi
                  </CardTitle>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Gunakan template Excel 3-Sheet (.xlsx) berpenanda warna untuk pengisian data yang akurat
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadExcelTemplate(masterData)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shrink-0 font-medium"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download Template .xlsx
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
                  <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Sheet 1: Template Import
                  </div>
                  <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed text-[11px]">
                    Kolom Biru (Wajib), Hijau (Pilihan Sistem), dan Kuning (Opsional). Dilengkapi baris contoh yang otomatis dilewati sistem.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                  <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Sheet 2: Panduan Pengisian
                  </div>
                  <p className="text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed text-[11px]">
                    Penjelasan lengkap format tanggal (YYYY-MM-DD), aturan multi-platform (pisahkan koma), dan pencegahan kesalahan umum.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40">
                  <div className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Sheet 3: Referensi Pilihan
                  </div>
                  <p className="text-purple-700/80 dark:text-purple-300/80 leading-relaxed text-[11px]">
                    Daftar resmi Content Pillar Humas PLN UID Jawa Barat, Target Platform, Format Konten, dan Tujuan Konten dari database.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Dropzone Upload File */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b bg-surface-muted/30">
              <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                2. Upload &amp; Pilih File Rencana Konten
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center transition-all hover:border-primary hover:bg-blue-50/20 dark:hover:bg-blue-950/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  {isReadingFile ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {file ? file.name : 'Klik untuk memilih file atau seret file ke sini'}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Mendukung format file <strong>.xlsx</strong> (Excel) dan <strong>.csv</strong> (Maksimal 500 baris per upload)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>

              {fileError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* File Information & Start Validation Action */}
              {file && parsedRows.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink">{file.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {(file.size / 1024).toFixed(1)} KB • Terdeteksi <strong>{parsedRows.length} baris</strong> rencana konten
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-slate-600 hover:text-ink cursor-pointer px-3 py-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                      Ganti File
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="sr-only"
                        onChange={handleFileInput}
                      />
                    </label>
                    <Button
                      onClick={handleStartValidation}
                      disabled={isValidating || parsedRows.length === 0}
                      className="w-full sm:w-auto text-xs"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Memvalidasi...
                        </>
                      ) : (
                        <>
                          Mulai Validasi Data
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: LOADING VALIDASI                                  */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <Card className="p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h3 className="text-base font-semibold text-ink">Memvalidasi Data Rencana Konten...</h3>
            <p className="text-xs text-ink-muted max-w-md">
              Sistem sedang memeriksa kesesuaian format tanggal, relasi pilar dan platform di database, serta mendeteksi kemungkinan duplikasi.
            </p>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* STEP 3: PREVIEW & ANALISIS HASIL VALIDASI                */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="space-y-5">
          {/* 4 Kartu KPI Ringkasan Validasi */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card
              onClick={() => setFilterStatus('ALL')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterStatus === 'ALL'
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-400/40 dark:bg-blue-950/20'
                  : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Total Baris</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {validationSummary.total}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Seluruh data yang diupload</p>
            </Card>

            <Card
              onClick={() => setFilterStatus('VALID')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterStatus === 'VALID'
                  ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400/40 dark:bg-emerald-950/20'
                  : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <span>Data Valid</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                {validationSummary.valid}
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                Siap untuk diimport ke sistem
              </p>
            </Card>

            <Card
              onClick={() => setFilterStatus('INVALID')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterStatus === 'INVALID'
                  ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400/40 dark:bg-rose-950/20'
                  : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-400">
                <span>Data Tidak Valid</span>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-900 dark:text-rose-200 mt-1">
                {validationSummary.invalid}
              </div>
              <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                Format/relasi salah, perlu perbaikan
              </p>
            </Card>

            <Card
              onClick={() => setFilterStatus('DUPLICATE')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterStatus === 'DUPLICATE'
                  ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-400/40 dark:bg-amber-950/20'
                  : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span>Data Duplikat</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                {validationSummary.duplicate}
              </div>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                Sudah ada di file / database
              </p>
            </Card>
          </div>

          {/* Action Header & Filter Bar */}
          <Card className="border-border shadow-xs">
            <div className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                  <Input
                    placeholder="Cari baris, judul, topik, atau pesan error..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterStatus === 'ALL'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Semua ({validationSummary.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('VALID')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterStatus === 'VALID'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    Valid ({validationSummary.valid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('INVALID')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterStatus === 'INVALID'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    Tidak Valid ({validationSummary.invalid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('DUPLICATE')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterStatus === 'DUPLICATE'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    Duplikat ({validationSummary.duplicate})
                  </button>
                </div>
              </div>

              {/* Action Buttons: Download Error Report & Next Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadValidationReportExcel(validationRows)}
                    className="text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    Download Laporan Validasi (.xlsx)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-slate-600"
                  >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Upload Ulang
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentStep(4)}
                    disabled={validationSummary.valid === 0}
                    className="text-xs font-semibold"
                  >
                    Lanjutkan ke Konfirmasi ({validationSummary.valid} Valid)
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabel Preview Validasi */}
          <Card className="border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="border-b bg-surface-muted/60 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary w-14">
                      Baris
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary min-w-[200px]">
                      Judul Konten
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary">
                      Topik
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary">
                      Content Pillar
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary">
                      Platform
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary whitespace-nowrap">
                      Tgl Rencana
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-ink-secondary w-24">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-secondary min-w-[250px]">
                      Detail Masalah / Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada data yang sesuai dengan filter atau pencarian saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((row) => {
                      const isRowValid = row.status === 'VALID'
                      const isRowWarning = row.status === 'WARNING'
                      const isRowDuplicate = row.status === 'DUPLICATE'
                      const isRowInvalid = row.status === 'INVALID'

                      return (
                        <tr
                          key={row.row_number}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isRowInvalid
                              ? 'bg-rose-50/30 dark:bg-rose-950/10'
                              : isRowDuplicate
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono text-slate-500">
                            #{row.row_number}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-ink">
                            {row.title || <span className="italic text-rose-500">Kosong</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {row.topic || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {row.pillar || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {row.platform || '-'}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono">
                            {row.planned_date || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isRowValid && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
                                Valid
                              </Badge>
                            )}
                            {isRowWarning && (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]">
                                Warning
                              </Badge>
                            )}
                            {isRowDuplicate && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]">
                                Duplikat
                              </Badge>
                            )}
                            {isRowInvalid && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 text-[10px]">
                                Invalid
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.errors.length > 0 ? (
                              <ul className="space-y-0.5 text-rose-600 dark:text-rose-400 text-[11px]">
                                {row.errors.map((err, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span>•</span>
                                    <span>{err}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : row.warnings.length > 0 ? (
                              <ul className="space-y-0.5 text-blue-600 dark:text-blue-400 text-[11px]">
                                {row.warnings.map((w, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span>•</span>
                                    <span>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                                Siap diimport
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: KONFIRMASI PARTIAL IMPORT                         */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="border-b bg-surface-muted/30">
            <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Konfirmasi Import Data Rencana Konten
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Pemberitahuan Partial Import
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                Terdapat <strong>{validationSummary.valid} baris data valid</strong> dan{' '}
                <strong>{validationSummary.invalid + validationSummary.duplicate} baris data bermasalah</strong>.
                Sesuai kebijakan keamanan data, sistem <strong>hanya akan menyimpan {validationSummary.valid} data valid</strong> ke dalam database sebagai rencana konten baru (status <em>Planned</em>).
              </p>
            </div>

            {/* Statistik yang akan disimpan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  Akan Disimpan
                </span>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                  {validationSummary.valid}
                </div>
                <span className="text-[11px] text-emerald-600">Konten Valid</span>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
                  Akan Dilewati (Invalid)
                </span>
                <div className="text-3xl font-bold text-rose-900 dark:text-rose-200 mt-1">
                  {validationSummary.invalid}
                </div>
                <span className="text-[11px] text-rose-600">Perlu Perbaikan</span>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  Akan Dilewati (Duplikat)
                </span>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                  {validationSummary.duplicate}
                </div>
                <span className="text-[11px] text-amber-600">Sudah Terdaftar</span>
              </div>
            </div>

            {/* Tombol Aksi Konfirmasi */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto text-xs"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Kembali ke Preview
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleExecuteImport}
                  disabled={isImporting || validationSummary.valid === 0}
                  className="w-full sm:w-auto text-xs font-semibold bg-primary"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Menyimpan Data ke Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Simpan &amp; Import {validationSummary.valid} Konten Valid
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================= */}
      {/* STEP 5: HASIL IMPORT & LAPORAN                            */}
      {/* ========================================================= */}
      {currentStep === 5 && importResult && (
        <Card className="border-border shadow-xs">
          <CardHeader className="border-b bg-surface-muted/30">
            <CardTitle className="text-base font-semibold text-ink flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Proses Import Rencana Konten Selesai
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Ringkasan Hasil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  Berhasil Disimpan
                </span>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                  {importResult.imported}
                </div>
                <span className="text-[11px] text-emerald-600">Rencana Konten Baru</span>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  Dilewati / Duplikat
                </span>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                  {importResult.skipped}
                </div>
                <span className="text-[11px] text-amber-600">Tidak Mengubah Database</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs text-slate-700 dark:text-slate-400 font-semibold">
                  Total Diproses
                </span>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {importResult.imported + importResult.skipped}
                </div>
                <span className="text-[11px] text-slate-500">Baris Data</span>
              </div>
            </div>

            {/* Error List jika ada */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 mb-2">
                  Catatan Baris yang Dilewati ({importResult.errors.length} baris):
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-700 dark:text-rose-400">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono font-semibold">Baris #{err.row}:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigasi Lanjutan */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="text-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Import File Lain
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadValidationReportExcel(validationRows, 'Laporan_Hasil_Import_Konten.xlsx')}
                  className="text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download Laporan Hasil (.xlsx)
                </Button>

                <Link href="/content/planning">
                  <Button size="sm" className="text-xs font-semibold">
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Lihat Rencana Konten
                  </Button>
                </Link>

                <Link href="/content/planning?tab=calendar">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Buka Kalender
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
