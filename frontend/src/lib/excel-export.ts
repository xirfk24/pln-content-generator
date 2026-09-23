import ExcelJS from 'exceljs'
import {
  CONTENT_STATUS_LABELS,
  CONTENT_PURPOSE_LABELS,
  POSTING_CATEGORY_LABELS,
  CONTENT_PRIORITY_LABELS,
} from '@/constants'
import { formatDate } from '@/lib/utils'

export interface ReportItem {
  id?: string
  title: string
  topic: string
  pillar?: string | null
  platform?: string | null
  category?: string | null
  format?: string | null
  content_purpose?: string | null
  posting_category?: string | null
  status: string
  planned_date?: string | null
  priority?: string | null
}

export interface ExportReportOptions {
  periodLabel: string
  semesterName?: string
  monthName?: string
  dateFrom?: string
  dateTo?: string
  platformName?: string
  pillarName?: string
  statusName?: string
}

const INDO_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/**
 * Format tanggal lengkap bahasa Indonesia untuk header dokumen
 */
function formatIndoDateTime(d: Date): string {
  const day = d.getDate()
  const month = INDO_MONTH_NAMES[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, pukul ${hours}:${minutes} WIB`
}

/**
 * Trigger download of Blob as file in browser
 */
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

/**
 * Sanitize and truncate sheet name for Excel (max 31 chars, no invalid chars)
 */
function sanitizeSheetName(name: string): string {
  const clean = name.replace(/[:\\/?*[\]]/g, ' ').trim()
  return clean.substring(0, 31) || 'Sheet'
}

// ==========================================
// COLOR PALETTE (PLN Light Blue Theme)
// ==========================================
const PLN_CYAN_PRIMARY = '00A2B9'   // Warna utama PLN Cyan
const PLN_DARK_CYAN = '005B6E'      // Warna teks header / title
const PLN_SOFT_BG = 'E6F7FA'        // Biru muda lembut untuk background banner & cards
const PLN_CARD_BORDER = '7DD3FC'    // Border kartu
const PLN_ZEBRA_BG = 'F4FBFD'       // Striping baris genap soft cyan
const BORDER_COLOR = 'CBD5E1'       // Border tabel slate halus
const TEXT_DARK = '0F172A'          // Teks gelap kontras tinggi
const TEXT_MUTED = '475569'         // Teks sekunder

/**
 * Render standard formal PLN content table onto a worksheet
 */
function populateSheet(
  ws: ExcelJS.Worksheet,
  items: ReportItem[],
  sheetTitle: string,
  periodSubtitle: string,
  options: ExportReportOptions,
  isMonthlySheet: boolean = false
) {
  // Page Setup
  ws.views = [{ showGridLines: true }]
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }

  // ==========================================
  // 1. HEADER BANNER PERUSAHAAN (Rows 1–4)
  // ==========================================
  // Row 1: Instansi
  ws.mergeCells('A1:L1')
  const r1 = ws.getCell('A1')
  r1.value = 'PT PLN (PERSERO) UNIT INDUK DISTRIBUSI JAWA BARAT'
  r1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: PLN_DARK_CYAN } }
  r1.alignment = { vertical: 'middle', horizontal: 'left' }

  // Row 2: Judul Dokumen
  ws.mergeCells('A2:L2')
  const r2 = ws.getCell('A2')
  r2.value = sheetTitle
  r2.font = { name: 'Calibri', size: 15, bold: true, color: { argb: TEXT_DARK } }
  r2.alignment = { vertical: 'middle', horizontal: 'left' }

  // Row 3: Periode Info
  ws.mergeCells('A3:L3')
  const r3 = ws.getCell('A3')
  r3.value = `Periode: ${periodSubtitle}`
  r3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PLN_DARK_CYAN } }
  r3.alignment = { vertical: 'middle', horizontal: 'left' }

  // Row 4: Metadata Cetak & Filter Tambahan
  ws.mergeCells('A4:L4')
  const r4 = ws.getCell('A4')
  const filterParts = []
  if (options.platformName) filterParts.push(`Platform: ${options.platformName}`)
  if (options.pillarName) filterParts.push(`Pilar: ${options.pillarName}`)
  if (options.statusName) filterParts.push(`Status: ${options.statusName}`)
  const filterText = filterParts.length > 0 ? ` | Filter: ${filterParts.join(', ')}` : ''
  r4.value = `Tanggal Ekspor: ${formatIndoDateTime(new Date())}${filterText}`
  r4.font = { name: 'Calibri', size: 10, italic: true, color: { argb: TEXT_MUTED } }
  r4.alignment = { vertical: 'middle', horizontal: 'left' }

  ws.getRow(1).height = 20
  ws.getRow(2).height = 25
  ws.getRow(3).height = 20
  ws.getRow(4).height = 18
  ws.getRow(5).height = 10 // Spacing

  // ==========================================
  // 2. EXECUTIVE SUMMARY STATS CARDS (Rows 6–8)
  // ==========================================
  const totalCount = items.length
  const publishedCount = items.filter((i) => i.status === 'PUBLISHED').length
  const inProgressCount = items.filter((i) =>
    ['APPROVED', 'PRODUCTION', 'PENDING_PRODUCTION_REVIEW', 'READY_TO_PUBLISH'].includes(i.status)
  ).length
  const draftOrReviewCount = items.filter((i) =>
    ['DRAFT', 'PENDING_REVIEW'].includes(i.status)
  ).length

  // Card 1: Total Konten (A6:C7)
  ws.mergeCells('A6:C6')
  ws.getCell('A6').value = isMonthlySheet ? 'TOTAL KONTEN BULAN INI' : 'TOTAL KONTEN'
  ws.getCell('A6').font = { name: 'Calibri', size: 9, bold: true, color: { argb: PLN_DARK_CYAN } }
  ws.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('A7:C7')
  ws.getCell('A7').value = totalCount
  ws.getCell('A7').font = { name: 'Calibri', size: 16, bold: true, color: { argb: TEXT_DARK } }
  ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' }

  // Card 2: Dipublikasikan (D6:F7)
  ws.mergeCells('D6:F6')
  ws.getCell('D6').value = 'SUDAH DIPUBLIKASIKAN'
  ws.getCell('D6').font = { name: 'Calibri', size: 9, bold: true, color: { argb: '047857' } }
  ws.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('D7:F7')
  const pubPercent = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0
  ws.getCell('D7').value = `${publishedCount} Konten (${pubPercent}%)`
  ws.getCell('D7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: '047857' } }
  ws.getCell('D7').alignment = { horizontal: 'center', vertical: 'middle' }

  // Card 3: Dalam Produksi & Siap (G6:I7)
  ws.mergeCells('G6:I6')
  ws.getCell('G6').value = 'PRODUKSI & SIAP PUBLIKASI'
  ws.getCell('G6').font = { name: 'Calibri', size: 9, bold: true, color: { argb: '0369A1' } }
  ws.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('G7:I7')
  ws.getCell('G7').value = `${inProgressCount} Konten`
  ws.getCell('G7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0369A1' } }
  ws.getCell('G7').alignment = { horizontal: 'center', vertical: 'middle' }

  // Card 4: Draft & Review (J6:L7)
  ws.mergeCells('J6:L6')
  ws.getCell('J6').value = 'DRAFT & REVIEW KONSEP'
  ws.getCell('J6').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'B45309' } }
  ws.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells('J7:L7')
  ws.getCell('J7').value = `${draftOrReviewCount} Konten`
  ws.getCell('J7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'B45309' } }
  ws.getCell('J7').alignment = { horizontal: 'center', vertical: 'middle' }

  // Style cards background and borders
  const cardRanges = [
    { startCol: 1, endCol: 3, bg: 'E6F7FA' },
    { startCol: 4, endCol: 6, bg: 'ECFDF5' },
    { startCol: 7, endCol: 9, bg: 'F0F9FF' },
    { startCol: 10, endCol: 12, bg: 'FFFBEB' },
  ]

  cardRanges.forEach(({ startCol, endCol, bg }) => {
    for (let r = 6; r <= 7; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bg },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: PLN_CARD_BORDER } },
          bottom: { style: 'thin', color: { argb: PLN_CARD_BORDER } },
          left: c === startCol ? { style: 'thin', color: { argb: PLN_CARD_BORDER } } : undefined,
          right: c === endCol ? { style: 'thin', color: { argb: PLN_CARD_BORDER } } : undefined,
        }
      }
    }
  })

  ws.getRow(6).height = 18
  ws.getRow(7).height = 24
  ws.getRow(8).height = 12 // Spacing

  // ==========================================
  // 3. TABLE HEADERS (Row 9)
  // ==========================================
  const headers = [
    'No.',
    'Judul Konten',
    'Topik / Subtema',
    'Content Pillar',
    'Platform',
    'Format',
    'Tujuan Konten',
    'Kategori Posting',
    'Tanggal Rencana',
    'Prioritas',
    'Status Konten',
  ]

  const headerRow = ws.getRow(9)
  headerRow.height = 28

  headers.forEach((h, idx) => {
    const colNum = idx + 1
    const cell = headerRow.getCell(colNum)
    cell.value = h
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PLN_CYAN_PRIMARY },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'medium', color: { argb: PLN_DARK_CYAN } },
      bottom: { style: 'medium', color: { argb: PLN_DARK_CYAN } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } },
    }
  })

  // Set column widths
  ws.columns = [
    { key: 'no', width: 6 },
    { key: 'title', width: 34 },
    { key: 'topic', width: 24 },
    { key: 'pillar', width: 28 },
    { key: 'platform', width: 16 },
    { key: 'format', width: 16 },
    { key: 'purpose', width: 18 },
    { key: 'posting', width: 18 },
    { key: 'date', width: 16 },
    { key: 'priority', width: 12 },
    { key: 'status', width: 22 },
  ]

  // ==========================================
  // 4. DATA ROWS (Row 10 onwards)
  // ==========================================
  let currentRowIndex = 10

  items.forEach((item, index) => {
    const row = ws.getRow(currentRowIndex)
    row.height = 22

    const isEven = index % 2 === 1
    const rowBg = isEven ? PLN_ZEBRA_BG : 'FFFFFF'

    const statusLabel = CONTENT_STATUS_LABELS[item.status] || item.status
    const purposeLabel = item.content_purpose
      ? CONTENT_PURPOSE_LABELS[item.content_purpose] || item.content_purpose
      : '-'
    const postingLabel = item.posting_category
      ? POSTING_CATEGORY_LABELS[item.posting_category] || item.posting_category
      : '-'
    const priorityLabel = item.priority
      ? CONTENT_PRIORITY_LABELS[item.priority] || item.priority
      : '-'

    const dateFormatted = item.planned_date ? formatDate(item.planned_date) : '-'

    const rowValues = [
      index + 1,
      item.title || '-',
      item.topic || '-',
      item.pillar || '-',
      item.platform || '-',
      item.format || '-',
      purposeLabel,
      postingLabel,
      dateFormatted,
      priorityLabel,
      statusLabel,
    ]

    rowValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1)
      cell.value = val
      cell.font = { name: 'Calibri', size: 10, color: { argb: TEXT_DARK } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg },
      }
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      }

      // Column alignments
      if (cIdx === 0) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (cIdx === 1 || cIdx === 2 || cIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      } else if (cIdx === 4 || cIdx === 5 || cIdx === 8 || cIdx === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (cIdx === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        if (item.status === 'PUBLISHED') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '047857' } }
        } else if (item.status === 'APPROVED' || item.status === 'READY_TO_PUBLISH') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0369A1' } }
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      }
    })

    currentRowIndex++
  })

  // Empty state row if no data
  if (items.length === 0) {
    ws.mergeCells(`A${currentRowIndex}:L${currentRowIndex}`)
    const emptyCell = ws.getCell(`A${currentRowIndex}`)
    emptyCell.value = isMonthlySheet
      ? 'Tidak ada konten yang direncanakan pada bulan ini.'
      : 'Tidak ada data konten yang sesuai dengan filter yang dipilih.'
    emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: TEXT_MUTED } }
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    emptyCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F8FAFC' },
    }
    emptyCell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    }
    ws.getRow(currentRowIndex).height = 36
    currentRowIndex++
  }

  // ==========================================
  // 5. TABLE FOOTER SUMMARY (Row currentRowIndex)
  // ==========================================
  ws.mergeCells(`A${currentRowIndex}:H${currentRowIndex}`)
  const summaryLeft = ws.getCell(`A${currentRowIndex}`)
  summaryLeft.value = `TOTAL KONTEN TERDATA: ${items.length} KONTEN`
  summaryLeft.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PLN_DARK_CYAN } }
  summaryLeft.alignment = { vertical: 'middle', horizontal: 'left' }

  ws.mergeCells(`I${currentRowIndex}:L${currentRowIndex}`)
  const summaryRight = ws.getCell(`I${currentRowIndex}`)
  summaryRight.value = `Publikasi: ${publishedCount} | Dalam Proses: ${inProgressCount} | Draft: ${draftOrReviewCount}`
  summaryRight.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PLN_DARK_CYAN } }
  summaryRight.alignment = { vertical: 'middle', horizontal: 'right' }

  for (let c = 1; c <= 12; c++) {
    const cell = ws.getCell(currentRowIndex, c)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PLN_SOFT_BG },
    }
    cell.border = {
      top: { style: 'thin', color: { argb: PLN_CYAN_PRIMARY } },
      bottom: { style: 'double', color: { argb: PLN_CYAN_PRIMARY } },
      left: c === 1 ? { style: 'thin', color: { argb: PLN_CYAN_PRIMARY } } : undefined,
      right: c === 12 ? { style: 'thin', color: { argb: PLN_CYAN_PRIMARY } } : undefined,
    }
  }
  ws.getRow(currentRowIndex).height = 24
  currentRowIndex++

  // Spacing
  currentRowIndex++

  // ==========================================
  // 6. OFFICIAL FOOTER NOTE
  // ==========================================
  ws.mergeCells(`A${currentRowIndex}:L${currentRowIndex}`)
  const foot = ws.getCell(`A${currentRowIndex}`)
  foot.value =
    '* Dokumen ini digenerate secara otomatis oleh Sistem Content Manager – Humas PLN Unit Induk Distribusi Jawa Barat.'
  foot.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '94A3B8' } }
  foot.alignment = { vertical: 'middle', horizontal: 'left' }

  // Auto-filter on the header row
  ws.autoFilter = {
    from: 'A9',
    to: 'L9',
  }
}

/**
 * Export Laporan Konten ke file Excel (.xlsx) resmi dengan Multi-Sheets:
 * - Sheet 1: Rekap Keseluruhan (Semester / Periode Terpilih)
 * - Sheet 2..N: Sheet Terpisah Per Bulan (Juli 2026, Agustus 2026, dst.)
 */
export async function exportContentReportToExcel(
  items: ReportItem[],
  options: ExportReportOptions
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Humas PLN UID Jawa Barat'
  wb.lastModifiedBy = 'Content Manager PLN'
  wb.created = new Date()
  wb.modified = new Date()

  // ============================================================
  // SHEET 1: REKAP KESELURUHAN (SEMESTER / PERIODE UTAMA)
  // ============================================================
  const mainSheetName = options.semesterName
    ? sanitizeSheetName(`Rekap ${options.semesterName}`)
    : 'Rekap Keseluruhan'

  const wsMain = wb.addWorksheet(mainSheetName)
  wsMain.properties.tabColor = { argb: PLN_CYAN_PRIMARY }

  const mainTitle = options.semesterName
    ? `LAPORAN PERENCANAAN KONTEN — ${options.semesterName.toUpperCase()}`
    : 'LAPORAN PERENCANAAN & REKAP PUBLIKASI KONTEN'

  populateSheet(wsMain, items, mainTitle, options.periodLabel || 'Semua Periode', options, false)

  // ============================================================
  // GENERATE MONTHLY SHEETS (SHEETS PER BULAN)
  // ============================================================
  // Tentukan daftar bulan yang akan dibuatkan sheet
  const monthMap = new Map<string, { label: string; items: ReportItem[]; startDate?: string; endDate?: string }>()

  // 1. Jika ada rentang tanggal semester (dateFrom & dateTo), buatkan slot semua bulan dalam semester
  if (options.dateFrom && options.dateTo) {
    const sDate = new Date(options.dateFrom)
    const eDate = new Date(options.dateTo)
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      const cur = new Date(sDate.getFullYear(), sDate.getMonth(), 1)
      const last = new Date(eDate.getFullYear(), eDate.getMonth(), 1)

      while (cur <= last) {
        const y = cur.getFullYear()
        const m = cur.getMonth()
        const mKey = `${y}-${String(m + 1).padStart(2, '0')}`
        const mLabel = `${INDO_MONTH_NAMES[m]} ${y}`
        const lastDay = new Date(y, m + 1, 0).getDate()

        monthMap.set(mKey, {
          label: mLabel,
          items: [],
          startDate: `${y}-${String(m + 1).padStart(2, '0')}-01`,
          endDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        })
        cur.setMonth(cur.getMonth() + 1)
      }
    }
  }

  // 2. Masukkan konten ke masing-masing bulan
  items.forEach((item) => {
    if (item.planned_date) {
      const mKey = item.planned_date.substring(0, 7) // 'YYYY-MM'
      if (monthMap.has(mKey)) {
        monthMap.get(mKey)!.items.push(item)
      } else {
        // Jika belum ada di map (misal tanggal di luar dateFrom/dateTo)
        const [yStr, mStr] = mKey.split('-')
        const y = parseInt(yStr, 10)
        const m = parseInt(mStr, 10) - 1
        const mLabel = (!isNaN(y) && !isNaN(m) && INDO_MONTH_NAMES[m])
          ? `${INDO_MONTH_NAMES[m]} ${y}`
          : mKey
        monthMap.set(mKey, {
          label: mLabel,
          items: [item],
        })
      }
    }
  })

  // 3. Buat worksheet untuk setiap bulan
  // Urutkan bulan secara kronologis
  const sortedMonthKeys = Array.from(monthMap.keys()).sort()

  // Hanya buat sheet bulanan jika ada minimal 1 bulan
  sortedMonthKeys.forEach((mKey) => {
    const monthData = monthMap.get(mKey)!
    const sheetName = sanitizeSheetName(monthData.label)

    // Hindari nama sheet duplikat dengan main sheet
    const finalSheetName = sheetName === mainSheetName ? `${sheetName} (Bulan)` : sheetName

    const wsMonth = wb.addWorksheet(finalSheetName)
    wsMonth.properties.tabColor = { argb: '0284C7' } // Tab color sky blue

    const monthTitle = `LAPORAN PERENCANAAN KONTEN — BULAN ${monthData.label.toUpperCase()}`
    const monthSubtitle = monthData.startDate && monthData.endDate
      ? `${monthData.label} (${formatDate(monthData.startDate)} – ${formatDate(monthData.endDate)})${options.semesterName ? ` • ${options.semesterName}` : ''}`
      : monthData.label

    populateSheet(wsMonth, monthData.items, monthTitle, monthSubtitle, options, true)
  })

  // Generate buffer & trigger download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const safePeriod = (options.periodLabel || 'Semua_Periode')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30)
  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `Laporan_Konten_PLN_${safePeriod}_${dateStamp}.xlsx`

  triggerDownload(blob, fileName)
}
