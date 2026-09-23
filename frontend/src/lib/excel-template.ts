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
  pic: string
  brief: string
  target_audience: string
  reference: string
  // Additional fields for LEGACY_PUBLISHED import mode
  post_url?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
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

type ColumnCategory = 'MANDATORY' | 'SYSTEM' | 'METRICS' | 'OPTIONAL'

/**
 * Styling helper untuk mempercantik tampilan sheet Excel dengan warna, border, font, dan alignment profesional.
 */
function styleWorksheet(
  ws: ExcelJS.Worksheet,
  columnTypes?: ColumnCategory[]
) {
  // 1. Tampilkan grid lines secara tegas
  ws.views = [{ showGridLines: true }]

  // 2. Formatting Header Row (Baris 1)
  const headerRow = ws.getRow(1)
  headerRow.height = 32

  headerRow.eachCell((cell, colNumber) => {
    const colType = columnTypes?.[colNumber - 1] || 'MANDATORY'
    let bgColor = '1A3A6B' // Default Corporate PLN Dark Navy

    if (colType === 'SYSTEM') {
      bgColor = '0E6251' // Deep Emerald Teal
    } else if (colType === 'METRICS') {
      bgColor = '5B2C6F' // Deep Indigo Purple
    } else if (colType === 'OPTIONAL') {
      bgColor = '34495E' // Slate Gray
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + bgColor },
    }
    cell.font = {
      name: 'Segoe UI',
      size: 10.5,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    }
  })

  // 3. Formatting Data Rows (Baris 2 dan seterusnya)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.height = 24

    const isEven = rowNumber % 2 === 0
    const rowBg = isEven ? 'F8FAFC' : 'FFFFFF'

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        name: 'Segoe UI',
        size: 9.5,
        color: { argb: 'FF1E293B' },
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + rowBg },
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      // Format Angka vs Teks vs Tanggal
      if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.numFmt = '#,##0'
      } else {
        const strVal = String(cell.value || '').trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(strVal) || /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(strVal) || strVal === 'UID' || strVal === 'EDUCATION') {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        }
      }
    })
  })
}

/**
 * Normalisasi format tanggal input Excel yang fleksibel:
 * Mendukung "13/07/2026", "13-07-2026", "2026-07-13", "2026/07/13", Date object, maupun Excel Serial Number.
 * Menghasilkan output standar "YYYY-MM-DD".
 */

export function normalizeDateValue(rawVal: any): string {
  if (rawVal == null) return ''

  // 1. Jika rawVal adalah JavaScript Date Object
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    const y = rawVal.getFullYear()
    const m = String(rawVal.getMonth() + 1).padStart(2, '0')
    const d = String(rawVal.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 2. Jika rawVal adalah Cell Value Object dari ExcelJS
  if (typeof rawVal === 'object') {
    if (rawVal.result instanceof Date && !isNaN(rawVal.result.getTime())) {
      const y = rawVal.result.getFullYear()
      const m = String(rawVal.result.getMonth() + 1).padStart(2, '0')
      const d = String(rawVal.result.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (rawVal.text != null) rawVal = rawVal.text
    else if (rawVal.result != null) rawVal = rawVal.result
    else rawVal = String(rawVal)
  }

  let str = String(rawVal).trim()
  if (!str) return ''

  // 3. Hapus waktu ISO jika ada (2026-07-13T00:00:00Z)
  if (str.includes('T')) {
    str = str.split('T')[0]
  }

  // 4. Format DD/MM/YYYY, DD-MM-YYYY, atau DD.MM.YYYY (Contoh: 13/07/2026 atau 13-07-2026)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10)
    const p2 = parseInt(dmyMatch[2], 10)
    const year = dmyMatch[3]

    let day = p1
    let month = p2
    // Jika angka kedua > 12 (contoh: 07/13/2026), berarti format MM/DD/YYYY
    if (p2 > 12) {
      day = p2
      month = p1
    }

    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  // 5. Format YYYY/MM/DD, YYYY-MM-DD, atau YYYY.MM.DD (Contoh: 2026/07/13 atau 2026-07-13)
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const mm = String(parseInt(ymdMatch[2], 10)).padStart(2, '0')
    const dd = String(parseInt(ymdMatch[3], 10)).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  // 6. Format Excel Serial Date Number (Contoh: 46216 -> 2026-07-13)
  if (!isNaN(Number(str)) && Number(str) > 30000 && Number(str) < 70000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const days = Number(str)
    const dateObj = new Date(excelEpoch.getTime() + days * 86400000)
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getUTCFullYear()
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  return str
}

/**
 * Generate dan download file Template Excel (.xlsx) dengan pilihan mode:
 * - PLAN: Rencana Konten Baru
 * - LEGACY_PUBLISHED: Arsip Pemindahan Data Lama
 */
export async function downloadExcelTemplate(
  masterData?: MasterDataInfo,
  mode: 'PLAN' | 'LEGACY_PUBLISHED' = 'PLAN'
) {
  const wb = new ExcelJS.Workbook()

  const pillar1 = masterData?.pillars?.[0]?.name || CONTENT_PILLAR_OPTIONS[0] || 'Inovasi Layanan & Digitalisasi (PLN Mobile)'
  const pillar2 = masterData?.pillars?.[1]?.name || CONTENT_PILLAR_OPTIONS[1] || 'Transisi Energi & Keberlanjutan (Green Energy)'

  if (mode === 'LEGACY_PUBLISHED') {
    // ==========================================
    // MODE 2: ARSIP PEMINDAHAN DATA LAMA (TERBIT + INSIGHT)
    // ==========================================
    const wsTemplate = wb.addWorksheet('Template Arsip Data Lama')

    const headers = [
      'Tanggal Publikasi (DD/MM/YYYY atau YYYY-MM-DD)',
      'Judul Konten (Wajib)',
      'Topik Konten (Wajib)',
      'Content Pillar (Pilihan Sistem)',
      'Format Konten (Pilihan Sistem)',
      'Target Platform (Pilihan Sistem)',
      'Link Postingan (URL Post)',
      'Views / Jangkauan (Angka)',
      'Likes / Suka (Angka)',
      'Comments / Komentar (Angka)',
      'Shares / Bagikan (Angka)',
      'PIC (Opsional)',
      'Brief / Keterangan (Opsional)',
    ]

    const columnTypes: ColumnCategory[] = [
      'MANDATORY',
      'MANDATORY',
      'MANDATORY',
      'SYSTEM',
      'SYSTEM',
      'SYSTEM',
      'METRICS',
      'METRICS',
      'METRICS',
      'METRICS',
      'METRICS',
      'OPTIONAL',
      'OPTIONAL',
    ]

    const sampleRows = [
      [
        '15/08/2026',
        '[CONTOH - HAPUS SEBELUM IMPORT] Peluncuran Fitur Baru PLN Mobile Jabar',
        'Layanan & Digitalisasi',
        pillar1,
        'Carousel',
        'Instagram, TikTok',
        'https://www.instagram.com/p/C123456789/',
        12500,
        840,
        45,
        120,
        'Tim Medsos PLN UID Jabar',
        'Arsip dokumentasi penayangan konten edukasi fitur transaksi token.',
      ],
      [
        '20/08/2026',
        '[CONTOH - HAPUS SEBELUM IMPORT] Peringatan Hari Listrik Nasional ke-81',
        'Event & Momentum',
        pillar2,
        'Vid/Reels/Shorts',
        'Instagram, YouTube',
        'https://youtube.com/shorts/abc123xyz',
        35000,
        2400,
        180,
        450,
        'Tim Humas',
        'Video highlight perayaan HLN di kantor PLN UID Jabar.',
      ],
    ]

    addAoA(wsTemplate, [headers, ...sampleRows])

    const colWidths = [32, 38, 28, 44, 20, 28, 38, 22, 18, 20, 18, 24, 40]
    colWidths.forEach((w, i) => {
      wsTemplate.getColumn(i + 1).width = w
    })

    styleWorksheet(wsTemplate, columnTypes)

    // Sheet 2: Panduan Pemindahan Data
    const wsGuide = wb.addWorksheet('Panduan Pemindahan Data')
    const guideHeaders = ['No', 'Nama Kolom', 'Status', 'Format', 'Contoh', 'Keterangan']
    const guideRows = [
      [1, 'Tanggal Publikasi', 'Wajib (Biru)', 'DD/MM/YYYY atau YYYY-MM-DD', '13/07/2026 atau 2026-07-13', 'Tanggal saat konten terbit. Boleh gunakan separator / atau - (misal: 13/07/2026)'],
      [2, 'Judul Konten', 'Wajib (Biru)', 'Teks', 'Tips Token Listrik', 'Judul resmi konten lama'],
      [3, 'Topik Konten', 'Wajib (Biru)', 'Teks', 'PLN Mobile', 'Topik bahasan'],
      [4, 'Content Pillar', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi', pillar1, 'Gunakan nama pilar resmi di Sheet Referensi'],
      [5, 'Format Konten', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi', 'Carousel', CONTENT_FORMATS.join(', ')],
      [6, 'Target Platform', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi', 'Instagram, TikTok', 'Pisahkan koma jika tayang di banyak platform'],
      [7, 'Link Postingan', 'Data Insight (Ungu)', 'URL Web', 'https://instagram.com/p/...', 'Tautan postingan asli yang telah terbit'],
      [8, 'Views / Jangkauan', 'Data Insight (Ungu)', 'Angka', 12500, 'Jumlah tayangan / jangkauan audiens'],
      [9, 'Likes / Suka', 'Data Insight (Ungu)', 'Angka', 840, 'Jumlah suka / reaksi'],
      [10, 'Comments / Komentar', 'Data Insight (Ungu)', 'Angka', 45, 'Jumlah komentar'],
      [11, 'Shares / Bagikan', 'Data Insight (Ungu)', 'Angka', 120, 'Jumlah dibagikan'],
      [12, 'PIC', 'Opsional (Abu)', 'Teks', 'Tim Media Sosial', 'Penanggung jawab konten'],
      [13, 'Brief / Keterangan', 'Opsional (Abu)', 'Teks', 'Catatan penayangan', 'Deskripsi tambahan'],
    ]
    addAoA(wsGuide, [guideHeaders, ...guideRows])
    const guideWidths = [6, 24, 20, 24, 32, 48]
    guideWidths.forEach((w, i) => {
      wsGuide.getColumn(i + 1).width = w
    })
    styleWorksheet(wsGuide, ['MANDATORY', 'MANDATORY', 'SYSTEM', 'SYSTEM', 'OPTIONAL', 'OPTIONAL'])

    // Sheet 3: Referensi Pilihan
    const wsRef = wb.addWorksheet('Referensi Pilihan')
    const refPillars = masterData?.pillars?.map((p) => p.name) || CONTENT_PILLAR_OPTIONS
    const refPlatforms = masterData?.platforms?.map((p) => p.name) || [
      'Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Website', 'Twitter/X', 'Threads',
    ]
    const maxRows = Math.max(refPillars.length, refPlatforms.length, CONTENT_FORMATS.length)
    const refHeaders = ['Content Pillar (Resmi)', 'Target Platform', 'Format Konten']
    const refRows: string[][] = []
    for (let i = 0; i < maxRows; i++) {
      refRows.push([refPillars[i] || '', refPlatforms[i] || '', CONTENT_FORMATS[i] || ''])
    }
    addAoA(wsRef, [refHeaders, ...refRows])
    const refWidths = [46, 28, 22]
    refWidths.forEach((w, i) => {
      wsRef.getColumn(i + 1).width = w
    })
    styleWorksheet(wsRef, ['SYSTEM', 'SYSTEM', 'SYSTEM'])

    const buffer = await wb.xlsx.writeBuffer()
    triggerDownload(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'Template_Import_Arsip_Data_Lama_PLN.xlsx'
    )
  } else {
    // ==========================================
    // MODE 1: IMPORT RENCANA KONTEN (DEFAULT)
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
      'Tanggal Rencana Publikasi (DD/MM/YYYY atau YYYY-MM-DD)',
      'PIC (Opsional)',
      'Brief / Keterangan (Opsional)',
      'Target Audience (Opsional)',
      'Link Referensi (Opsional)',
    ]

    const columnTypes: ColumnCategory[] = [
      'MANDATORY',
      'MANDATORY',
      'SYSTEM',
      'SYSTEM',
      'SYSTEM',
      'SYSTEM',
      'SYSTEM',
      'MANDATORY',
      'OPTIONAL',
      'OPTIONAL',
      'OPTIONAL',
      'OPTIONAL',
    ]

    const sampleRows = [
      [
        '[CONTOH - HAPUS SEBELUM IMPORT] 5 Langkah Efisiensi Energi di Rumah',
        'PLN Mobile & Edukasi Tarif',
        pillar1,
        'Carousel',
        'Instagram, TikTok',
        'EDUCATION',
        'UID',
        '20/09/2026',
        'Tim Media Sosial',
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
        'UID',
        '25/09/2026',
        'Tim Humas & Komunikasi',
        'Highlight komitmen EBT PLN UID Jawa Barat menyongsong Net Zero Emission.',
        'Masyarakat Umum & Stakeholder',
        '',
      ],
    ]

    addAoA(wsTemplate, [headers, ...sampleRows])

    const colWidths = [38, 28, 44, 20, 28, 22, 22, 34, 22, 40, 30, 28]
    colWidths.forEach((w, i) => {
      wsTemplate.getColumn(i + 1).width = w
    })

    styleWorksheet(wsTemplate, columnTypes)

    // Sheet 2: Panduan Pengisian
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
      [5, 'Target Platform', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Bisa Multi)', 'Instagram, TikTok, YouTube', 'Pisahkan dengan tanda koma (,) jika konten tayang di lebih dari 1 platform', 'Nama platform tidak sesuai.'],
      [6, 'Content Purpose', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Opsional)', 'EDUCATION', CONTENT_PURPOSES.join(', '), 'Nilai di luar daftar tujuan konten resmi.'],
      [7, 'Posting Category', 'Pilihan Sistem (Hijau)', 'Pilihan Resmi (Opsional)', 'UID', POSTING_CATEGORIES.join(', '), 'Nilai di luar kategori posting resmi.'],
      [8, 'Tanggal Rencana Publikasi', 'Wajib (Biru)', 'DD/MM/YYYY atau YYYY-MM-DD', '20/09/2026 atau 2026-09-20', 'Bisa menggunakan format DD/MM/YYYY (20/09/2026), DD-MM-YYYY (20-09-2026), atau YYYY-MM-DD.', 'Bebas gunakan separator / atau -.'],
      [9, 'PIC', 'Opsional (Abu)', 'Teks', 'Tim Media Sosial / Adit', 'Person in charge atau nama tim pelaksana', 'Boleh dikosongkan.'],
      [10, 'Brief / Keterangan', 'Opsional (Abu)', 'Teks Paragraf', 'Penjelasan narasi slide 1-5', 'Arahan ringkas produksi konten', 'Boleh dikosongkan.'],
      [11, 'Target Audience', 'Opsional (Abu)', 'Teks', 'Pelanggan Rumah Tangga', 'Segmen audiens sasaran', 'Boleh dikosongkan.'],
      [12, 'Link Referensi', 'Opsional (Abu)', 'URL Web', 'https://pln.co.id/press-release', 'Tautan rujukan berita atau materi', 'Boleh dikosongkan.'],
    ]

    addAoA(wsGuide, [guideHeaders, ...guideRows])
    const guideWidths = [6, 24, 20, 24, 32, 44, 38]
    guideWidths.forEach((w, i) => {
      wsGuide.getColumn(i + 1).width = w
    })
    styleWorksheet(wsGuide, ['MANDATORY', 'MANDATORY', 'SYSTEM', 'SYSTEM', 'OPTIONAL', 'OPTIONAL', 'OPTIONAL'])

    // Sheet 3: Referensi Pilihan
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
      'Target Platform',
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
    const refWidths = [46, 26, 20, 20, 20]
    refWidths.forEach((w, i) => {
      wsRef.getColumn(i + 1).width = w
    })
    styleWorksheet(wsRef, ['SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM'])

    const buffer = await wb.xlsx.writeBuffer()
    triggerDownload(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'Template_Import_Rencana_Konten_PLN.xlsx'
    )
  }
}

/**
 * Parsing file .xlsx atau .csv dari user
 */
export async function parseUploadedFile(file: File): Promise<ParsedImportRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)

  const sheetName =
    wb.worksheets.find((ws) => {
      const n = ws.name.toLowerCase()
      return n.includes('template') || n.includes('import') || n.includes('arsip') || n.includes('data')
    })?.name ||
    wb.worksheets[0]?.name

  if (!sheetName) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  const ws = wb.getWorksheet(sheetName)
  if (!ws) {
    throw new Error('Sheet data tidak ditemukan di dalam file Excel.')
  }

  const rawData: any[][] = []
  ws.eachRow((row) => {
    const values = (row.values as any[]).slice(1)
    rawData.push(values)
  })

  if (rawData.length < 2) {
    throw new Error('File tidak memiliki baris data (minimal 1 baris header + 1 baris data).')
  }

  const headerRow = rawData[0].map((h) => String(h != null ? h : '').trim().toLowerCase())

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
  const idxPic = findColIdx(['pic', 'penanggung'])
  const idxBrief = findColIdx(['brief', 'keterangan', 'deskripsi'])
  const idxAudience = findColIdx(['audience', 'audiens', 'sasaran'])
  const idxRef = findColIdx(['link referensi', 'referensi', 'reference', 'tautan referensi'])

  // Additional fields for LEGACY_PUBLISHED
  const idxPostUrl = findColIdx(['link postingan', 'url postingan', 'post url', 'link post', 'url'])
  const idxViews = findColIdx(['views', 'view', 'jangkauan', 'reach', 'tayangan'])
  const idxLikes = findColIdx(['likes', 'like', 'suka'])
  const idxComments = findColIdx(['comments', 'comment', 'komen', 'komentar'])
  const idxShares = findColIdx(['shares', 'share', 'bagikan'])

  if (idxTitle === -1 || idxTopic === -1) {
    throw new Error(
      'Header kolom Judul Konten ("Title") dan Topik Konten ("Topic") tidak ditemukan. Pastikan menggunakan format template yang disediakan.'
    )
  }

  const parseStr = (val: any): string => {
    if (val == null) return ''
    if (typeof val === 'object' && val.text) return String(val.text).trim()
    return String(val).trim()
  }

  const parseNum = (valStr: any): number | undefined => {
    if (valStr == null) return undefined
    const str = parseStr(valStr)
    if (!str) return undefined
    const clean = str.replace(/[^0-9]/g, '')
    if (!clean) return undefined
    const n = parseInt(clean, 10)
    return isNaN(n) ? undefined : n
  }

  const parsedRows: ParsedImportRow[] = []

  for (let i = 1; i < rawData.length; i++) {
    const r = rawData[i]
    if (!r || r.every((cell) => parseStr(cell) === '')) {
      continue
    }

    const titleVal = parseStr(r[idxTitle])
    if (titleVal.toUpperCase().startsWith('[CONTOH')) {
      continue
    }

    const dateVal = idxDate !== -1 ? normalizeDateValue(r[idxDate]) : ''

    parsedRows.push({
      row_number: i + 1,
      title: titleVal,
      topic: idxTopic !== -1 ? parseStr(r[idxTopic]) : '',
      pillar: idxPillar !== -1 ? parseStr(r[idxPillar]) : '',
      format: idxFormat !== -1 ? parseStr(r[idxFormat]) : '',
      platform: idxPlatform !== -1 ? parseStr(r[idxPlatform]) : '',
      content_purpose: idxPurpose !== -1 ? parseStr(r[idxPurpose]) : '',
      category: idxCategory !== -1 ? parseStr(r[idxCategory]) : '',
      posting_category: idxPostCat !== -1 ? parseStr(r[idxPostCat]) : '',
      planned_date: dateVal,
      pic: idxPic !== -1 ? parseStr(r[idxPic]) : '',
      brief: idxBrief !== -1 ? parseStr(r[idxBrief]) : '',
      target_audience: idxAudience !== -1 ? parseStr(r[idxAudience]) : '',
      reference: idxRef !== -1 ? parseStr(r[idxRef]) : '',
      // Legacy Published data
      post_url: idxPostUrl !== -1 ? parseStr(r[idxPostUrl]) : undefined,
      views: idxViews !== -1 ? parseNum(r[idxViews]) : undefined,
      likes: idxLikes !== -1 ? parseNum(r[idxLikes]) : undefined,
      comments: idxComments !== -1 ? parseNum(r[idxComments]) : undefined,
      shares: idxShares !== -1 ? parseNum(r[idxShares]) : undefined,
    })
  }

  return parsedRows
}

/**
 * Export Laporan Hasil Validasi ke file Excel dengan styling yang rapi
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
    'No. Baris Excel',
    'Judul Konten',
    'Topik Konten',
    'Content Pillar',
    'Target Platform',
    'Tanggal Rencana / Terbit',
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
  const colWidths = [16, 38, 26, 32, 24, 20, 16, 60]
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  styleWorksheet(ws, [
    'MANDATORY',
    'MANDATORY',
    'MANDATORY',
    'SYSTEM',
    'SYSTEM',
    'MANDATORY',
    'SYSTEM',
    'OPTIONAL',
  ])

  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}
