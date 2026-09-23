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

export interface PlatformMetricInput {
  url: string
  reach: number
  views: number
  likes: number
  comments: number
  saves: number
  shares: number
}

export const MASTER_PLATFORMS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'YouTube',
  'Twitter/X',
]

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
  // Additional fields for LEGACY_PUBLISHED mode
  post_url?: string
  reach?: number
  views?: number
  likes?: number
  comments?: number
  saves?: number
  shares?: number
  platform_publications?: Record<string, PlatformMetricInput>
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

/** Helper untuk memformat tanggal fleksibel (bisa memakai -, /, ., atau , serta Serial Number Excel) menjadi YYYY-MM-DD */
export function parseFlexibleDate(rawDate: string): string {
  if (!rawDate) return ''
  let cleaned = rawDate.trim()

  // Support Excel Serial Date Numbers (e.g., 46217 for 14/07/2026)
  if (/^\d{5}$/.test(cleaned)) {
    const serial = parseInt(cleaned, 10)
    if (serial > 35000 && serial < 80000) {
      const date = new Date((serial - 25569) * 86400 * 1000)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  if (cleaned.includes('T')) {
    cleaned = cleaned.split('T')[0]
  }

  // Normalisasi delimiter (/, ., , => -)
  const normalized = cleaned.replace(/[\/\.,]/g, '-')
  const parts = normalized.split('-').map((p) => p.trim())

  if (parts.length === 3) {
    let year = ''
    let month = ''
    let day = ''

    if (parts[0].length === 4) {
      // Format YYYY-MM-DD
      year = parts[0]
      month = parts[1].padStart(2, '0')
      day = parts[2].padStart(2, '0')
    } else if (parts[2].length === 4) {
      // Format DD-MM-YYYY
      day = parts[0].padStart(2, '0')
      month = parts[1].padStart(2, '0')
      year = parts[2]
    }

    if (year && month && day) {
      return `${year}-${month}-${day}`
    }
  }

  return cleaned
}

/** Helper untuk styling worksheet ExcelJS dengan warna-warni profesional per grup kolom */
function applyColorfulWorksheetStyles(
  ws: ExcelJS.Worksheet,
  headerFills: string[],
  colWidths: number[]
) {
  const headerRow = ws.getRow(1)
  headerRow.height = 34

  headerRow.eachCell((cell, colNumber) => {
    const fillHex = headerFills[colNumber - 1] || 'FF1E3E62'
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillHex },
    }
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' },
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  // Style data rows
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 24
    const isEven = rowNumber % 2 === 0
    row.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: false }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }
    })
  })

  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
}

/**
 * Generate dan download file Template Excel (.xlsx) Berwarna & Lengkap
 * Tanggal diletakkan pada Kolom 1 (Paling Kiri).
 * Mendukung mode 'LEGACY_PUBLISHED' (Pemindahan Data Lama) dan 'PLAN' (Rencana Konten Baru).
 */
export async function downloadExcelTemplate(masterData?: MasterDataInfo, mode?: string) {
  const wb = new ExcelJS.Workbook()
  const isLegacy = mode === 'LEGACY_PUBLISHED'

  const pillar1 =
    masterData?.pillars?.[0]?.name ||
    CONTENT_PILLAR_OPTIONS[0] ||
    'Inovasi Layanan & Digitalisasi (PLN Mobile)'
  const pillar2 =
    masterData?.pillars?.[1]?.name ||
    CONTENT_PILLAR_OPTIONS[1] ||
    'Transisi Energi & Keberlanjutan (Green Energy)'

  if (isLegacy) {
    // ==========================================
    // SHEET 1: TEMPLATE IMPORT DATA LAMA (LEGACY)
    // Struktur Kolom disamakan persis dengan Hasil Ekspor Excel
    // ==========================================
    const wsTemplate = wb.addWorksheet('Template Data Lama')

    const headers = [
      'Tanggal Terbit (Flexible: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)',
      'Judul Konten (Wajib)',
      'Topik / Subtema (Wajib)',
      'Content Pillar (Pilihan Sistem)',
      'Format (Pilihan Sistem)',
      'Tujuan Konten (Pilihan Sistem)',
      'Kategori Posting (Pilihan Sistem)',
      'Status Konten (PUBLISHED)',
    ]

    const headerFills = [
      'FF1E40AF', // Tanggal: Dark Blue
      'FF00A2B9', // Judul: Cyan
      'FF00A2B9', // Topik: Cyan
      'FF00A2B9', // Pillar: Cyan
      'FF00A2B9', // Format: Cyan
      'FF00A2B9', // Tujuan: Cyan
      'FF00A2B9', // Kategori: Cyan
      'FF005B6E', // Status: Dark Cyan
    ]

    const colWidths = [28, 38, 28, 32, 18, 20, 20, 20]

    MASTER_PLATFORMS.forEach((pName) => {
      headers.push(`Link ${pName}`)
      headerFills.push('FF047857') // Emerald for Link
      headers.push(`Reach ${pName}`)
      headerFills.push('FF5B21B6') // Violet for Insight
      headers.push(`Views ${pName}`)
      headerFills.push('FF5B21B6')
      headers.push(`Likes ${pName}`)
      headerFills.push('FF5B21B6')
      headers.push(`Komen ${pName}`)
      headerFills.push('FF5B21B6')
      headers.push(`Saves ${pName}`)
      headerFills.push('FF5B21B6')
      headers.push(`Shares ${pName}`)
      headerFills.push('FF5B21B6')

      colWidths.push(32, 14, 14, 12, 14, 12, 12)
    })

    headers.push('Brief / Keterangan (Opsional)')
    headerFills.push('FF334155')
    colWidths.push(40)

    const sampleRows = [
      [
        '2026-09-20',
        '[CONTOH - HAPUS SEBELUM IMPORT] 5 Langkah Efisiensi Energi di Rumah',
        'PLN Mobile & Edukasi Tarif',
        pillar1,
        'Carousel',
        'EDUCATION',
        'ORIGINAL',
        'PUBLISHED',
        // Instagram
        'https://www.instagram.com/p/C123456789/',
        12500,
        15400,
        1280,
        95,
        320,
        145,
        // Facebook
        '', 0, 0, 0, 0, 0, 0,
        // TikTok
        'https://www.tiktok.com/@pln/video/78912345',
        8500,
        11200,
        940,
        42,
        180,
        95,
        // YouTube
        '', 0, 0, 0, 0, 0, 0,
        // Twitter/X
        '', 0, 0, 0, 0, 0, 0,
        'Arsip konten edukasi tips hemat listrik bagi pelanggan rumah tangga di wilayah Jawa Barat.',
      ],
      [
        '25/09/2026',
        '[CONTOH - HAPUS SEBELUM IMPORT] Green Energy Transition: PLTS Terapung Cirata',
        'Transisi Energi Bersih',
        pillar2,
        'Vid/Reels/Shorts',
        'INFORMATION',
        'ORIGINAL',
        'PUBLISHED',
        // Instagram
        'https://www.instagram.com/reel/C987654321/',
        45000,
        52300,
        4120,
        310,
        890,
        640,
        // Facebook
        'https://www.facebook.com/pln/videos/123456',
        18000,
        21000,
        1500,
        110,
        230,
        140,
        // TikTok
        'https://www.tiktok.com/@pln/video/98765432',
        62000,
        78000,
        5400,
        420,
        1100,
        850,
        // YouTube
        'https://www.youtube.com/watch?v=abc123xyz',
        12000,
        14500,
        980,
        65,
        150,
        80,
        // Twitter/X
        '', 0, 0, 0, 0, 0, 0,
        'Highlight komitmen EBT PLN UID Jawa Barat menyongsong Net Zero Emission.',
      ],
    ]

    addAoA(wsTemplate, [headers, ...sampleRows])
    applyColorfulWorksheetStyles(wsTemplate, headerFills, colWidths)

    // ==========================================
    // SHEET 2: PANDUAN PENGISIAN DATA LAMA
    // ==========================================
    const wsGuide = wb.addWorksheet('Panduan Pengisian Data Lama')

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
      [1, 'Tanggal Terbit (Kolom 1)', 'Wajib (Biru)', 'Tanggal Fleksibel', '2026-09-20 atau 20/09/2026', 'Diletakkan di Kolom 1. Mendukung pemisah strip (-), garis miring (/), titik (.), atau koma (,)', 'Tahun tidak 4 digit.'],
      [2, 'Judul Konten', 'Wajib (Cyan)', 'Teks Bebas', 'Tips Hemat Listrik Bersama PLN Mobile', 'Judul resmi konten yang telah terbit', 'Jangan dikosongkan.'],
      [3, 'Topik / Subtema', 'Wajib (Cyan)', 'Teks Bebas', 'PLN Mobile & Pelayanan', 'Fokus topik bahasan konten', 'Jangan dikosongkan.'],
      [4, 'Content Pillar', 'Pilihan Sistem (Cyan)', 'Pilihan Resmi', pillar1, 'Lihat daftar lengkap pada Sheet 3 (Referensi Pilihan)', 'Nama pilar salah eja atau tidak terdaftar di sistem.'],
      [5, 'Format', 'Pilihan Sistem (Cyan)', 'Pilihan Resmi', 'Carousel', CONTENT_FORMATS.join(', '), 'Jika dikosongkan, otomatis default ke "Carousel".'],
      [6, 'Tujuan Konten', 'Pilihan Sistem (Cyan)', 'Pilihan Resmi', 'EDUCATION', CONTENT_PURPOSES.join(', '), 'Nilai di luar daftar tujuan konten resmi.'],
      [7, 'Kategori Posting', 'Pilihan Sistem (Cyan)', 'Pilihan Resmi', 'ORIGINAL', POSTING_CATEGORIES.join(', '), 'Nilai di luar kategori posting resmi.'],
      [8, 'Status Konten', 'Otomatis (Dark Cyan)', 'Teks', 'PUBLISHED', 'Otomatis berstatus PUBLISHED untuk arsip data lama', 'Tidak perlu diubah.'],
      [9, 'Link [Platform] (Instagram, Facebook, TikTok, YouTube, Twitter/X)', 'Opsional (Hijau Emerald)', 'URL Web', 'https://www.instagram.com/p/C123456789/', 'Tautan resmi postingan pada platform bersangkutan', 'Penulisan URL tidak lengkap.'],
      [10, 'Insight Per Platform (Reach, Views, Likes, Komen, Saves, Shares)', 'Insight Opsional (Ungu Violet)', 'Angka Bulat', '12500', 'Statistik performa konten per platform', 'Menggunakan huruf/koma.'],
      [11, 'Brief / Keterangan', 'Opsional (Slate)', 'Teks Paragraf', 'Arsip postingan penanganan gangguan', 'Catatan tambahan terkait arsip konten', 'Boleh dikosongkan.'],
    ]

    addAoA(wsGuide, [guideHeaders, ...guideRows])
    const guideFills = Array(7).fill('FF312E81')
    const guideWidths = [6, 28, 24, 22, 36, 48, 42]
    applyColorfulWorksheetStyles(wsGuide, guideFills, guideWidths)

  } else {
    // ==========================================
    // SHEET 1: TEMPLATE IMPORT RENCANA KONTEN (PLAN)
    // Tanggal Rencana Publikasi diletakkan di Kolom 1 (Paling Kiri)
    // ==========================================
    const wsTemplate = wb.addWorksheet('Template Import Rencana')

    const headers = [
      'Tanggal Rencana Publikasi (YYYY-MM-DD / Flexible)',
      'Judul Konten (Wajib)',
      'Topik Konten (Wajib)',
      'Content Pillar (Pilihan Sistem)',
      'Format Konten (Pilihan Sistem)',
      'Target Platform (Pilihan Sistem)',
      'Content Purpose (Pilihan Sistem)',
      'Posting Category (Pilihan Sistem)',
      'Brief / Keterangan (Opsional)',
      'Target Audience (Opsional)',
      'Link Referensi (Opsional)',
    ]

    const sampleRows = [
      [
        '2026-09-20',
        '[CONTOH - HAPUS SEBELUM IMPORT] 5 Langkah Efisiensi Energi di Rumah',
        'PLN Mobile & Edukasi Tarif',
        pillar1,
        'Carousel',
        'Instagram, TikTok',
        'EDUCATION',
        'ORIGINAL',
        'Edukasi tips hemat listrik bagi pelanggan rumah tangga di wilayah Jawa Barat.',
        'Pelanggan Rumah Tangga',
        'https://pln.co.id',
      ],
      [
        '25/09/2026',
        '[CONTOH - HAPUS SEBELUM IMPORT] Green Energy Transition: PLTS Terapung Cirata',
        'Transisi Energi Bersih',
        pillar2,
        'Vid/Reels/Shorts',
        'Instagram, YouTube, TikTok',
        'INFORMATION',
        'ORIGINAL',
        'Highlight komitmen EBT PLN UID Jawa Barat menyongsong Net Zero Emission.',
        'Masyarakat Umum & Stakeholder',
        '',
      ],
    ]

    addAoA(wsTemplate, [headers, ...sampleRows])
    const headerFills = [
      'FF1E40AF',
      'FF1E3A8A',
      'FF1E3A8A',
      'FF0F766E',
      'FF0F766E',
      'FF0F766E',
      'FF0F766E',
      'FF0F766E',
      'FF334155',
      'FF334155',
      'FF334155',
    ]
    const colWidths = [28, 38, 28, 44, 20, 28, 22, 22, 40, 30, 28]
    applyColorfulWorksheetStyles(wsTemplate, headerFills, colWidths)

    // ==========================================
    // SHEET 2: PANDUAN PENGISIAN RENCANA KONTEN
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
      [1, 'Tanggal Rencana Publikasi (Kolom 1)', 'Wajib (Biru)', 'Tanggal Fleksibel', '2026-09-20 atau 20/09/2026', 'Diletakkan di Kolom 1. Mendukung pemisah strip (-), garis miring (/), titik (.), atau koma (,)', 'Tahun tidak 4 digit.'],
      [2, 'Judul Konten', 'Wajib (Biru Navy)', 'Teks Bebas', 'Tips Hemat Listrik Bersama PLN Mobile', 'Judul singkat, menarik, dan informatif', 'Jangan dikosongkan.'],
      [3, 'Topik Konten', 'Wajib (Biru Navy)', 'Teks Bebas', 'PLN Mobile & Pelayanan', 'Fokus topik bahasan konten', 'Jangan dikosongkan.'],
      [4, 'Content Pillar', 'Pilihan Sistem (Teal)', 'Pilihan Resmi', pillar1, 'Lihat daftar lengkap pada Sheet 3 (Referensi Pilihan)', 'Nama pilar salah eja atau tidak terdaftar di sistem.'],
      [5, 'Format Konten', 'Pilihan Sistem (Teal)', 'Pilihan Resmi', 'Carousel', CONTENT_FORMATS.join(', '), 'Jika dikosongkan, otomatis default ke "Carousel".'],
      [6, 'Target Platform', 'Pilihan Sistem (Teal)', 'Pilihan Resmi (Bisa Multi)', 'Instagram, TikTok, YouTube', 'Pisahkan dengan tanda koma (,) jika konten tayang di lebih dari 1 platform', 'Nama platform tidak sesuai (misal: "IG" tanpa keterangan).'],
      [7, 'Content Purpose', 'Pilihan Sistem (Teal)', 'Pilihan Resmi (Opsional)', 'EDUCATION', CONTENT_PURPOSES.join(', '), 'Nilai di luar daftar tujuan konten resmi.'],
      [8, 'Posting Category', 'Pilihan Sistem (Teal)', 'Pilihan Resmi (Opsional)', 'ORIGINAL', POSTING_CATEGORIES.join(', '), 'Nilai di luar kategori posting resmi.'],
      [9, 'Brief / Keterangan', 'Opsional (Slate)', 'Teks Paragraf', 'Penjelasan narasi dan visual slide 1-5', 'Arahan ringkas produksi konten', 'Boleh dikosongkan.'],
      [10, 'Target Audience', 'Opsional (Slate)', 'Teks', 'Pelanggan Rumah Tangga & Milenial', 'Segmen audiens sasaran', 'Boleh dikosongkan.'],
      [11, 'Link Referensi', 'Opsional (Slate)', 'URL Web', 'https://pln.co.id/press-release', 'Tautan rujukan berita atau materi', 'Boleh dikosongkan.'],
    ]

    addAoA(wsGuide, [guideHeaders, ...guideRows])
    const guideFills = Array(7).fill('FF1E3A8A')
    const guideWidths = [6, 28, 22, 22, 36, 48, 42]
    applyColorfulWorksheetStyles(wsGuide, guideFills, guideWidths)
  }

  // ==========================================
  // SHEET 3: REFERENSI PILIHAN (SHARED)
  // ==========================================
  const wsRef = wb.addWorksheet('Referensi Pilihan')

  const refPillars = masterData?.pillars?.map((p) => p.name) || CONTENT_PILLAR_OPTIONS
  const refPlatforms = masterData?.platforms?.map((p) => p.name) || [
    'Instagram',
    'Facebook',
    'TikTok',
    'YouTube',
    'LinkedIn',
    'Website',
    'Twitter/X',
    'Threads',
  ]

  const maxRows = Math.max(
    refPillars.length,
    refPlatforms.length,
    CONTENT_FORMATS.length,
    CONTENT_PURPOSES.length,
    POSTING_CATEGORIES.length
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
  const refFills = Array(5).fill('FF0F766E')
  const refWidths = [46, 30, 22, 22, 22]
  applyColorfulWorksheetStyles(wsRef, refFills, refWidths)

  // Trigger download file .xlsx
  const buffer = await wb.xlsx.writeBuffer()
  const filename = isLegacy
    ? 'Template_Import_Pemindahan_Data_Lama_PLN.xlsx'
    : 'Template_Import_Rencana_Konten_PLN.xlsx'

  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  )
}

/** Helper untuk parse integer dari teks sel */
function parseIntValue(val?: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[^0-9]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

/**
 * Parsing file .xlsx atau .csv dari user
 * Pencarian kolom secara otomatis berdasarkan nama header (bebas urutan kolom)
 */
export async function parseUploadedFile(file: File): Promise<ParsedImportRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)

  // Pilih sheet pertama atau sheet yang memiliki nama "template", "import", atau "data"
  const sheetName =
    wb.worksheets.find((ws) => {
      const n = ws.name.toLowerCase()
      return n.includes('template') || n.includes('import') || n.includes('data')
    })?.name || wb.worksheets[0]?.name

  if (!sheetName) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  const ws = wb.getWorksheet(sheetName)
  if (!ws) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  // Convert to array-of-arrays dengan penanganan tipe sel (Date / Formatted Text / Number)
  const rawData: string[][] = []
  ws.eachRow((row) => {
    const rowVals: string[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      let cellStr = ''
      if (cell.value instanceof Date) {
        const y = cell.value.getFullYear()
        const m = String(cell.value.getMonth() + 1).padStart(2, '0')
        const d = String(cell.value.getDate()).padStart(2, '0')
        cellStr = `${y}-${m}-${d}`
      } else if (cell.text && typeof cell.text === 'string' && cell.text.trim() !== '') {
        cellStr = cell.text.trim()
      } else if (cell.value != null) {
        if (typeof cell.value === 'object' && 'result' in cell.value && cell.value.result != null) {
          cellStr = String(cell.value.result)
        } else {
          cellStr = String(cell.value)
        }
      }
      rowVals.push(cellStr)
    })
    if (rowVals.length > 0) {
      rawData.push(rowVals)
    }
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
  const idxTopic = findColIdx(['topik', 'topic', 'subtema'])
  const idxPillar = findColIdx(['pillar', 'pilar', 'tema'])
  const idxFormat = findColIdx(['format'])
  const idxPlatform = findColIdx(['target platform', 'platform'])
  const idxPurpose = findColIdx(['purpose', 'tujuan'])
  const idxCategory = findColIdx(['category', 'kategori'])
  const idxPostCat = findColIdx(['posting category', 'kategori posting'])
  const idxDate = findColIdx(['tanggal', 'date', 'tgl', 'jadwal', 'terbit'])
  const idxBrief = findColIdx(['brief', 'keterangan', 'deskripsi'])
  const idxAudience = findColIdx(['audience', 'audiens', 'sasaran'])
  const idxRef = findColIdx(['link referensi', 'referensi', 'reference'])

  // Single column fallbacks for LEGACY_PUBLISHED
  const idxPostURL = findColIdx([
    'link post',
    'link platform',
    'url post',
    'tautan post',
    'post_url',
    'link',
    'url',
    'tautan',
  ])
  const idxReach = findColIdx(['reach', 'jangkauan'])
  const idxViews = findColIdx(['view', 'views', 'tayangan', 'penonton'])
  const idxLikes = findColIdx(['like', 'likes', 'suka'])
  const idxComments = findColIdx(['comment', 'comments', 'komentar', 'komen'])
  const idxSaves = findColIdx(['save', 'saves', 'disimpan', 'simpan'])
  const idxShares = findColIdx(['share', 'shares', 'bagikan'])

  // Detect per-platform columns (matching Excel Export format)
  const platformColIndices: Record<string, {
    url: number
    reach: number
    views: number
    likes: number
    comments: number
    saves: number
    shares: number
  }> = {}

  MASTER_PLATFORMS.forEach((pName) => {
    const pLower = pName.toLowerCase()
    const urlIdx = findColIdx([`link ${pLower}`, `tautan ${pLower}`, `url ${pLower}`])
    const reachIdx = findColIdx([`reach ${pLower}`, `jangkauan ${pLower}`])
    const viewsIdx = findColIdx([`views ${pLower}`, `view ${pLower}`, `tayangan ${pLower}`])
    const likesIdx = findColIdx([`likes ${pLower}`, `like ${pLower}`, `suka ${pLower}`])
    const commentsIdx = findColIdx([`komen ${pLower}`, `komentar ${pLower}`, `comments ${pLower}`])
    const savesIdx = findColIdx([`saves ${pLower}`, `save ${pLower}`, `disimpan ${pLower}`])
    const sharesIdx = findColIdx([`shares ${pLower}`, `share ${pLower}`, `bagikan ${pLower}`])

    if (urlIdx !== -1 || reachIdx !== -1 || viewsIdx !== -1 || likesIdx !== -1 || commentsIdx !== -1 || savesIdx !== -1 || sharesIdx !== -1) {
      platformColIndices[pName] = {
        url: urlIdx,
        reach: reachIdx,
        views: viewsIdx,
        likes: likesIdx,
        comments: commentsIdx,
        saves: savesIdx,
        shares: sharesIdx,
      }
    }
  })

  if (idxTitle === -1 || idxTopic === -1) {
    throw new Error(
      'Header kolom Judul Konten ("Title") dan Topik Konten ("Topic") tidak ditemukan. Pastikan menggunakan format template yang disediakan.'
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

    const rawDateStr = idxDate !== -1 ? (r[idxDate] || '').trim() : ''
    const dateVal = parseFlexibleDate(rawDateStr)

    // Build per-platform publications map if per-platform columns exist
    const platformPublications: Record<string, PlatformMetricInput> = {}
    const detectedPlatforms: string[] = []

    Object.entries(platformColIndices).forEach(([pName, cols]) => {
      const urlVal = cols.url !== -1 ? (r[cols.url] || '').trim() : ''
      const reachVal = cols.reach !== -1 ? parseIntValue(r[cols.reach]) : 0
      const viewsVal = cols.views !== -1 ? parseIntValue(r[cols.views]) : 0
      const likesVal = cols.likes !== -1 ? parseIntValue(r[cols.likes]) : 0
      const commentsVal = cols.comments !== -1 ? parseIntValue(r[cols.comments]) : 0
      const savesVal = cols.saves !== -1 ? parseIntValue(r[cols.saves]) : 0
      const sharesVal = cols.shares !== -1 ? parseIntValue(r[cols.shares]) : 0

      if (urlVal !== '' || reachVal > 0 || viewsVal > 0 || likesVal > 0 || commentsVal > 0 || savesVal > 0 || sharesVal > 0) {
        platformPublications[pName] = {
          url: urlVal,
          reach: reachVal,
          views: viewsVal,
          likes: likesVal,
          comments: commentsVal,
          saves: savesVal,
          shares: sharesVal,
        }
        detectedPlatforms.push(pName)
      }
    })

    let platformVal = idxPlatform !== -1 ? (r[idxPlatform] || '').trim() : ''
    if (!platformVal && detectedPlatforms.length > 0) {
      platformVal = detectedPlatforms.join(', ')
    }

    // Totals for single fields
    let aggregatedPostURL = idxPostURL !== -1 ? (r[idxPostURL] || '').trim() : ''
    let aggregatedReach = idxReach !== -1 ? parseIntValue(r[idxReach]) : 0
    let aggregatedViews = idxViews !== -1 ? parseIntValue(r[idxViews]) : 0
    let aggregatedLikes = idxLikes !== -1 ? parseIntValue(r[idxLikes]) : 0
    let aggregatedComments = idxComments !== -1 ? parseIntValue(r[idxComments]) : 0
    let aggregatedSaves = idxSaves !== -1 ? parseIntValue(r[idxSaves]) : 0
    let aggregatedShares = idxShares !== -1 ? parseIntValue(r[idxShares]) : 0

    if (Object.keys(platformPublications).length > 0) {
      Object.values(platformPublications).forEach((pm) => {
        if (!aggregatedPostURL && pm.url) aggregatedPostURL = pm.url
        aggregatedReach += pm.reach
        aggregatedViews += pm.views
        aggregatedLikes += pm.likes
        aggregatedComments += pm.comments
        aggregatedSaves += pm.saves
        aggregatedShares += pm.shares
      })
    }

    parsedRows.push({
      row_number: i + 1, // Baris 1-indexed di Excel
      title: titleVal,
      topic: idxTopic !== -1 ? (r[idxTopic] || '').trim() : '',
      pillar: idxPillar !== -1 ? (r[idxPillar] || '').trim() : '',
      format: idxFormat !== -1 ? (r[idxFormat] || '').trim() : '',
      platform: platformVal,
      content_purpose: idxPurpose !== -1 ? (r[idxPurpose] || '').trim() : '',
      category: idxCategory !== -1 ? (r[idxCategory] || '').trim() : '',
      posting_category: idxPostCat !== -1 ? (r[idxPostCat] || '').trim() : '',
      planned_date: dateVal,
      brief: idxBrief !== -1 ? (r[idxBrief] || '').trim() : '',
      target_audience: idxAudience !== -1 ? (r[idxAudience] || '').trim() : '',
      reference: idxRef !== -1 ? (r[idxRef] || '').trim() : '',
      post_url: aggregatedPostURL || undefined,
      reach: aggregatedReach,
      views: aggregatedViews,
      likes: aggregatedLikes,
      comments: aggregatedComments,
      saves: aggregatedSaves,
      shares: aggregatedShares,
      platform_publications: Object.keys(platformPublications).length > 0 ? platformPublications : undefined,
    })
  }

  return parsedRows
}

/**
 * Export Laporan Hasil Validasi atau Hasil Import ke file Excel
 */
export async function downloadValidationReportExcel(
  rows: Array<{
    row_number: number
    title: string
    topic: string
    pillar?: string
    platform?: string
    planned_date?: string
    status: string
    errors?: string[]
    warnings?: string[]
  }>,
  filename = 'Laporan_Validasi_Import_Konten.xlsx'
) {
  const headers = [
    'Tanggal Rencana/Terbit',
    'No. Baris Excel',
    'Judul Konten',
    'Topik Konten',
    'Content Pillar',
    'Target Platform',
    'Status Validasi',
    'Detail Error / Catatan Perbaikan',
  ]

  const reportData = rows.map((r) => {
    const errorMsg =
      [...(r.errors || []), ...(r.warnings || []).map((w) => `[Peringatan] ${w}`)].join(' | ') ||
      '-'

    return [
      r.planned_date || '-',
      r.row_number,
      r.title,
      r.topic,
      r.pillar || '-',
      r.platform || '-',
      r.status,
      errorMsg,
    ]
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Laporan Validasi')
  addAoA(ws, [headers, ...reportData])
  const headerFills = ['FF1E40AF', 'FF1E3A8A', 'FF1E3A8A', 'FF1E3A8A', 'FF0F766E', 'FF0F766E', 'FF312E81', 'FF334155']
  const colWidths = [20, 16, 36, 24, 32, 24, 16, 60]
  applyColorfulWorksheetStyles(ws, headerFills, colWidths)

  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  )
}
