import ExcelJS from 'exceljs'
import {
  CONTENT_FORMATS,
  CONTENT_PURPOSES,
  POSTING_CATEGORIES,
  CONTENT_PILLAR_OPTIONS,
} from '@/constants'

export interface MasterDataInfo {
  pillars: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string }>
}

export interface ParsedImportRow {
  row_number: number
  title: string
  topic: string
  planned_date: string
  platform: string
  format: string
  category: string
  pillar: string
  content_purpose: string
  posting_category: string
  brief: string
  target_audience: string
  reference: string
}

/** Trigger a browser download from a Blob. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Convert a 2D array (array-of-arrays) into worksheet rows. */
function addAoA(ws: ExcelJS.Worksheet, aoa: (string | number)[][]) {
  aoa.forEach((row) => ws.addRow(row))
}

/**
 * Generate dan download file Template Excel (.xlsx) dengan 3 Sheet Berwarna & Lengkap
 */
export async function downloadExcelTemplate(masterData?: MasterDataInfo) {
  const wb = new ExcelJS.Workbook()

  // ==========================================
  // SHEET 1: TEMPLATE IMPORT
  // ==========================================
  const wsTemplate = wb.addWorksheet('Template Import')

  const headers = [
    'Judul Konten (Wajib)',
    'Topik Konten (Wajib)',
    'Content Pillar (Pilihan Sistem)',
    'Format Konten (Pilihan Sistem)',
    'Target Platform (Pilihan Sistem)',
    'Content Purpose (Pilihan Sistem)',
    'Posting Category (Pilihan Sistem)',
    'Tanggal Rencana Publikasi (YYYY-MM-DD)',
    'Brief / Keterangan (Opsional)',
    'Target Audience (Opsional)',
    'Link Referensi (Opsional)',
  ]

  const pillar1 = masterData?.pillars?.[0]?.name || CONTENT_PILLAR_OPTIONS[0] || 'Inovasi Layanan & Digitalisasi (PLN Mobile)'
  const pillar2 = masterData?.pillars?.[1]?.name || CONTENT_PILLAR_OPTIONS[1] || 'Transisi Energi & Keberlanjutan (Green Energy)'

  const sampleRows = [
    [
      '[CONTOH - HAPUS SEBELUM IMPORT] 5 Langkah Efisiensi Energi di Rumah',
      'PLN Mobile & Edukasi Tarif',
      pillar1,
      'Carousel',
      'Instagram, TikTok',
      'EDUCATION',
      'ORIGINAL',
      '2026-09-20',
      'Edukasi tips hemat listrik bagi pelanggan rumah tangga di wilayah Jawa Barat.',
      'Pelanggan Rumah Tangga',
      'https://pln.co.id',
    ],
    [
      '[CONTOH - HAPUS SEBELUM IMPORT] Green Energy Transition: PLTS Terapung Cirata',
      'Transisi Energi Bersih',
      pillar2,
      'Vid/Reels/Shorts',
      'Instagram, YouTube, TikTok',
      'INFORMATION',
      'ORIGINAL',
      '2026-09-25',
      'Highlight komitmen EBT PLN UID Jawa Barat menyongsong Net Zero Emission.',
      'Masyarakat Umum & Stakeholder',
      '',
    ],
  ]

  addAoA(wsTemplate, [headers, ...sampleRows])

  // Lebar kolom
  const colWidths = [38, 28, 44, 20, 28, 22, 22, 26, 40, 30, 28]
  colWidths.forEach((w, i) => {
    wsTemplate.getColumn(i + 1).width = w
  })

  // ==========================================
  // SHEET 2: PANDUAN PENGISIAN
  // ==========================================
  const wsGuide = wb.addWorksheet('Panduan Pengisian')

  const guideHeaders = [
    'No',
    'Nama Kolom',
    'Status Kolom',
    'Format / Tipe Data',
    'Contoh Pengisian',
    'Nilai yang Diperbolehkan / Keterangan',
    'Catatan Kesalahan Umum',
  ]

  const guideRows = [
    [1, 'Judul Konten', 'Wajib (Biru)', 'Teks Bebas', 'Tips Hemat Listrik Bersama PLN Mobile', 'Judul singkat, menarik, dan informatif', 'Jangan dikosongkan.'],
    [2, 'Topik Konten', 'Wajib (Biru)', 'Teks Bebas', 'PLN Mobile & Pelayanan', 'Fokus topik bahasan konten', 'Jangan dikosongkan.'],
    [3, 'Content Pillar', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi', pillar1, 'Lihat daftar lengkap pada Sheet 3 (Referensi Pilihan)', 'Nama pilar salah eja atau tidak terdaftar di sistem.'],
    [4, 'Format Konten', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi', 'Carousel', CONTENT_FORMATS.join(', '), 'Jika dikosongkan, otomatis default ke "Carousel".'],
    [5, 'Target Platform', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Bisa Multi)', 'Instagram, TikTok, YouTube', 'Pisahkan dengan tanda koma (,) jika konten tayang di lebih dari 1 platform', 'Nama platform tidak sesuai (misal: "IG" tanpa keterangan).'],
    [6, 'Content Purpose', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Opsional)', 'EDUCATION', CONTENT_PURPOSES.join(', '), 'Nilai di luar daftar tujuan konten resmi.'],
    [7, 'Posting Category', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Opsional)', 'ORIGINAL', POSTING_CATEGORIES.join(', '), 'Nilai di luar kategori posting resmi.'],
    [8, 'Tanggal Rencana Publikasi', 'Wajib (Biru)', 'Tanggal (YYYY-MM-DD)', '2026-09-20', 'Tahun-Bulan-Tanggal 4 digit tahun (contoh: 2026-09-20)', 'Format DD/MM/YYYY atau teks bulan tidak didukung.'],
    [9, 'Brief / Keterangan', 'Opsional (Kuning)', 'Teks Paragraf', 'Penjelasan narasi dan visual slide 1-5', 'Arahan ringkas produksi konten', 'Boleh dikosongkan.'],
    [10, 'Target Audience', 'Opsional (Kuning)', 'Teks', 'Pelanggan Rumah Tangga & Milenial', 'Segmen audiens sasaran', 'Boleh dikosongkan.'],
    [11, 'Link Referensi', 'Opsional (Kuning)', 'URL Web', 'https://pln.co.id/press-release', 'Tautan rujukan berita atau materi', 'Boleh dikosongkan.'],
  ]

  addAoA(wsGuide, [guideHeaders, ...guideRows])
  const guideWidths = [6, 26, 22, 22, 36, 48, 42]
  guideWidths.forEach((w, i) => {
    wsGuide.getColumn(i + 1).width = w
  })

  // ==========================================
  // SHEET 3: REFERENSI PILIHAN
  // ==========================================
  const wsRef = wb.addWorksheet('Referensi Pilihan')

  const refPillars = masterData?.pillars?.map((p) => p.name) || CONTENT_PILLAR_OPTIONS
  const refPlatforms = masterData?.platforms?.map((p) => p.name) || [
    'Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Website', 'Twitter/X', 'Threads',
  ]

  const maxRows = Math.max(
    refPillars.length,
    refPlatforms.length,
    CONTENT_FORMATS.length,
    CONTENT_PURPOSES.length,
    POSTING_CATEGORIES.length,
  )

  const refHeaders = [
    'Content Pillar (Resmi)',
    'Target Platform (Dapat Digabung)',
    'Format Konten',
    'Content Purpose',
    'Posting Category',
  ]

  const refRows: string[][] = []
  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      refPillars[i] || '',
      refPlatforms[i] || '',
      CONTENT_FORMATS[i] || '',
      CONTENT_PURPOSES[i] || '',
      POSTING_CATEGORIES[i] || '',
    ])
  }

  addAoA(wsRef, [refHeaders, ...refRows])
  const refWidths = [46, 30, 22, 22, 22]
  refWidths.forEach((w, i) => {
    wsRef.getColumn(i + 1).width = w
  })

  // Trigger download
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'Template_Import_Rencana_Konten_PLN.xlsx',
  )
}

/**
 * Parsing file .xlsx atau .csv dari user
 */
export async function parseUploadedFile(file: File): Promise<ParsedImportRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)

  // Pilih sheet pertama atau sheet bernama "Template Import"
  const sheetName =
    wb.worksheets.find((ws) => {
      const n = ws.name.toLowerCase()
      return n.includes('template') || n.includes('import')
    })?.name ||
    wb.worksheets[0]?.name

  if (!sheetName) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  const ws = wb.getWorksheet(sheetName)
  if (!ws) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  // Convert to array-of-arrays
  const rawData: string[][] = []
  ws.eachRow((row, rowNumber) => {
    const values = (row.values as any[]).slice(1) // index 0 is empty in exceljs
    rawData.push(values.map((v) => (v != null ? String(v) : '')))
  })

  if (rawData.length < 2) {
    throw new Error('File tidak memiliki baris data (minimal 1 baris header + 1 baris data).')
  }

  const headerRow = rawData[0].map((h) => h.trim().toLowerCase())

  // Helper untuk mencari index kolom berdasarkan kata kunci
  const findColIdx = (keywords: string[]): number => {
    return headerRow.findIndex((col) => keywords.some((kw) => col.includes(kw.toLowerCase())))
  }

  const idxTitle = findColIdx(['judul', 'title'])
  const idxTopic = findColIdx(['topik', 'topic'])
  const idxPillar = findColIdx(['pillar', 'pilar', 'tema'])
  const idxFormat = findColIdx(['format'])
  const idxPlatform = findColIdx(['platform'])
  const idxPurpose = findColIdx(['purpose', 'tujuan'])
  const idxCategory = findColIdx(['category', 'kategori'])
  const idxPostCat = findColIdx(['posting category', 'kategori posting'])
  const idxDate = findColIdx(['tanggal', 'date', 'tgl', 'jadwal'])
  const idxBrief = findColIdx(['brief', 'keterangan', 'deskripsi'])
  const idxAudience = findColIdx(['audience', 'audiens', 'sasaran'])
  const idxRef = findColIdx(['link', 'referensi', 'reference', 'tautan'])

  if (idxTitle === -1 || idxTopic === -1) {
    throw new Error(
      'Header kolom Judul Konten ("Title") dan Topik Konten ("Topic") tidak ditemukan. Pastikan menggunakan format template yang disediakan.',
    )
  }

  const parsedRows: ParsedImportRow[] = []

  for (let i = 1; i < rawData.length; i++) {
    const r = rawData[i]
    if (!r || r.every((cell) => cell.trim() === '')) {
      continue // Skip baris kosong
    }

    const titleVal = (r[idxTitle] || '').trim()
    // Skip baris contoh yang diawali [CONTOH
    if (titleVal.toUpperCase().startsWith('[CONTOH')) {
      continue
    }

    let dateVal = idxDate !== -1 ? (r[idxDate] || '').trim() : ''
    // Format date string jika ada waktu atau format ISO
    if (dateVal.includes('T')) {
      dateVal = dateVal.split('T')[0]
    }

    parsedRows.push({
      row_number: i + 1, // Baris 1-indexed di Excel
      title: titleVal,
      topic: idxTopic !== -1 ? (r[idxTopic] || '').trim() : '',
      pillar: idxPillar !== -1 ? (r[idxPillar] || '').trim() : '',
      format: idxFormat !== -1 ? (r[idxFormat] || '').trim() : '',
      platform: idxPlatform !== -1 ? (r[idxPlatform] || '').trim() : '',
      content_purpose: idxPurpose !== -1 ? (r[idxPurpose] || '').trim() : '',
      category: idxCategory !== -1 ? (r[idxCategory] || '').trim() : '',
      posting_category: idxPostCat !== -1 ? (r[idxPostCat] || '').trim() : '',
      planned_date: dateVal,
      brief: idxBrief !== -1 ? (r[idxBrief] || '').trim() : '',
      target_audience: idxAudience !== -1 ? (r[idxAudience] || '').trim() : '',
      reference: idxRef !== -1 ? (r[idxRef] || '').trim() : '',
    })
  }

  return parsedRows
}

/**
 * Export Laporan Hasil Validasi atau Hasil Import ke file Excel
 */
export async function downloadValidationReportExcel(rows: Array<{
  row_number: number
  title: string
  topic: string
  pillar?: string
  platform?: string
  planned_date?: string
  status: string
  errors?: string[]
  warnings?: string[]
}>, filename = 'Laporan_Validasi_Import_Konten.xlsx') {
  const headers = [
    'No. Baris Excel',
    'Judul Konten',
    'Topik Konten',
    'Content Pillar',
    'Target Platform',
    'Tanggal Rencana',
    'Status Validasi',
    'Detail Error / Catatan Perbaikan',
  ]

  const reportData = rows.map((r) => {
    const errorMsg = [
      ...(r.errors || []),
      ...(r.warnings || []).map((w) => `[Peringatan] ${w}`),
    ].join(' | ') || '-'

    return [
      r.row_number,
      r.title,
      r.topic,
      r.pillar || '-',
      r.platform || '-',
      r.planned_date || '-',
      r.status,
      errorMsg,
    ]
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Laporan Validasi')
  addAoA(ws, [headers, ...reportData])
  const colWidths = [16, 36, 24, 32, 24, 18, 16, 60]
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  )
}
