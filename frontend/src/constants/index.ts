import { UserRole, ContentStatus, PublicationStatus } from '@/types'

export const USER_ROLES: UserRole[] = ['ADMIN', 'STAFF']

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator / Reviewer',
  STAFF: 'Staf / Pembuat Konten',
}

export const CONTENT_STATUSES: ContentStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'PRODUCTION',
  'PENDING_PRODUCTION_REVIEW',
  'REVISION_REQUIRED',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'REJECTED',
  'RESCHEDULED',
  'NOT_REALIZED',
]

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Menunggu Persetujuan Konsep',
  APPROVED: 'Konsep Disetujui',
  PRODUCTION: 'Produksi Konten',
  PENDING_PRODUCTION_REVIEW: 'Menunggu Review Produksi',
  REVISION_REQUIRED: 'Perlu Revisi',
  READY_TO_PUBLISH: 'Siap Publikasi',
  PUBLISHED: 'Dipublikasikan',
  REJECTED: 'Ditolak',
  RESCHEDULED: 'Dijadwalkan Ulang',
  NOT_REALIZED: 'Tidak Direalisasikan',
  TABUNGAN: 'Bank Konten',
}

export const CONTENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PENDING_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PRODUCTION: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_PRODUCTION_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REVISION_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  READY_TO_PUBLISH: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  PUBLISHED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  RESCHEDULED: 'bg-orange-50 text-orange-700 border-orange-200',
  NOT_REALIZED: 'bg-slate-100 text-slate-500 border-slate-200',
  TABUNGAN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export const PUBLICATION_STATUSES: PublicationStatus[] = ['PLANNED', 'PUBLISHED', 'DELAYED', 'CANCELLED']

export const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Belum Ditayangkan',
  PUBLISHED: 'Sudah Ditayangkan',
  DELAYED: 'Terlambat',
  DELAY: 'Terlambat',
  CANCELLED: 'Tidak Jadi Ditayangkan',
  CANCEL: 'Tidak Jadi Ditayangkan',
}

export const PUBLICATION_STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-50 text-blue-700 border-blue-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELAYED: 'bg-amber-50 text-amber-700 border-amber-200',
  DELAY: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCEL: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const CONTENT_FORMATS = [
  'Vid/Reels/Shorts',
  'Feed/Photo',
  'Carousel',
  'Story',
  'Article',
  'Infographic',
]

export const CONTENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const

export const CONTENT_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
}

export const CONTENT_PURPOSES = [
  'INFORMASI',
  'EDUKASI',
  'PUBLIKASI_KEGIATAN',
  'BRANDING',
  'DOKUMENTASI',
  'ENGAGEMENT',
] as const

export const CONTENT_PURPOSE_LABELS: Record<string, string> = {
  INFORMASI: 'Informasi',
  EDUKASI: 'Edukasi',
  PUBLIKASI_KEGIATAN: 'Publikasi Kegiatan',
  BRANDING: 'Branding',
  DOKUMENTASI: 'Dokumentasi',
  ENGAGEMENT: 'Engagement',
  EDUCATION: 'Edukasi',
  ENTERTAINMENT: 'Hiburan',
  INSPIRATIONAL: 'Inspirasional',
  PROMOTION: 'Promosi',
  INFORMATION: 'Informasi',
}

export const POSTING_CATEGORIES = [
  'UID',
  'REPOST_ID',
  'REPOST_MOBILE',
  'REPOST_UP3',
  'OTHER',
] as const

export const POSTING_CATEGORY_LABELS: Record<string, string> = {
  UID: 'UID',
  REPOST_ID: 'Repost PLN ID',
  REPOST_MOBILE: 'Repost PLN Mobile',
  REPOST_UP3: 'Repost UP3',
  OTHER: 'Lain-lain',
  // Backward compatibility
  ORIGINAL: 'UID',
  REPOST_PLN_ID: 'Repost PLN ID',
  REPOST_PLN_MOBILE: 'Repost PLN Mobile',
  CAMPAIGN: 'Kampanye / Event',
}

export const ENGAGEMENT_FORMULA =
  'Rumus Engagement Rate = (Likes + Comments + Shares + Saves) / Reach × 100%'

/** Daftar Pilihan Resmi Topik Konten PLN UID Jawa Barat (Sesuai Kode & Nama Resmi) */
export const PLN_TOPIC_OPTIONS = [
  'A - Bencana & Pemulihan',
  'B - TJSL',
  'C - EV/SPKLU',
  'D - Energi Baru Terbarukan/REC',
  'E - Jabar Smile',
  'F - Instalasi Listrik',
  'G - K3L',
  'I - Electrifying Lifestyle',
  'N - Penghargaan',
  'R - PLN Mobile',
  'S - Promo PLN',
  'T - Rekening/Tagihan Listrik',
  'U - Subsidi Listrik',
  'V - Surat Pembaca',
  'W - Tarif Tenaga Listrik',
  'X - Tingkat Mutu Pelayanan',
  'Z - Lain-Lain',
] as const

/** Daftar Standar Content Pillar */
export const CONTENT_PILLAR_OPTIONS = [
  'Kinerja & Capaian',
  'Prestasi & Penghargaan',
  'Program & Dampak',
  'Layanan & Edukasi',
  'Ngobrol & Momen',
] as const

/** Platform yang tidak diaktifkan pada modul antrean, analisis, performa, dan rekap */
export const EXCLUDED_PLATFORM_NAMES = ['linkedin', 'website', 'twitter/x', 'twitter', 'x']

export function isPlatformActive(name?: string | null): boolean {
  if (!name) return false
  const lower = name.trim().toLowerCase()
  return !EXCLUDED_PLATFORM_NAMES.includes(lower)
}

