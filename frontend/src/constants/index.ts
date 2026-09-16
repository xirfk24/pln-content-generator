import { UserRole, ContentStatus, PublicationStatus } from '@/types'

export const USER_ROLES: UserRole[] = ['ADMIN', 'STAFF']

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator / Reviewer',
  STAFF: 'Staf / Pembuat Konten',
}

export const CONTENT_STATUSES: ContentStatus[] = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REVISION_REQUIRED',
  'RESCHEDULED',
  'NOT_REALIZED',
]

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Dalam Proses',
  PENDING_REVIEW: 'Menunggu Persetujuan',
  REVISION_REQUIRED: 'Perlu Revisi',
  APPROVED: 'Disetujui',
  READY_TO_PUBLISH: 'Siap Publikasi',
  PUBLISHED: 'Dipublikasikan',
  RESCHEDULED: 'Dijadwalkan Ulang',
  NOT_REALIZED: 'Tidak Direalisasikan',
  TABUNGAN: 'Konten Tabungan',
}

export const CONTENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
  REVISION_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  READY_TO_PUBLISH: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  PUBLISHED: 'bg-teal-50 text-teal-700 border-teal-200',
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
  'ORIGINAL',
  'REPOST_PLN_ID',
  'REPOST_UP3',
  'CAMPAIGN',
  'OTHER',
] as const

export const POSTING_CATEGORY_LABELS: Record<string, string> = {
  ORIGINAL: 'Konten Original',
  REPOST_PLN_ID: 'Repost PLN ID',
  REPOST_UP3: 'Repost UP3',
  CAMPAIGN: 'Kampanye / Event',
  OTHER: 'Lainnya',
}

export const ENGAGEMENT_FORMULA =
  'Rumus Engagement Rate = (Likes + Comments + Shares + Saves) / Reach × 100%'

/** Daftar Pilihan Resmi Topik Konten PLN UID Jawa Barat (Diurutkan A - Z) */
export const PLN_TOPIC_OPTIONS = [
  'Bencana & Pemulihan',
  'Electrifying Lifestyle',
  'Energi Baru Terbarukan',
  'EV/SPKLU',
  'Instalasi Listrik',
  'Jabar Smile',
  'K3L',
  'Penghargaan',
  'PLN Mobile',
  'Promo PLN',
  'Rekening/Tagihan Listrik',
  'Subsidi Listrik',
  'Surat Pembaca',
  'Tarif Tenaga Listrik',
  'Tingkat Mutu Pelayanan',
  'TJSL',
  'Lain-lain',
] as const

/** Daftar Standar Content Pillar */
export const CONTENT_PILLAR_OPTIONS = [
  'Edukasi (Educational)',
  'Hiburan (Entertainment)',
  'Inspirasi (Inspirational)',
  'Interaksi & Komunitas (Engagement)',
  'Promosi / Penjualan (Promotional)',
  'Di Balik Layar (Behind the Scenes)',
  'Bukti Sosial & Ulasan (Social Proof / Testimonials)',
  'Tren & Relevansi Terkini (Trending / Relatable)',
  'Berita & Wawasan Industri (Industry News & Insights)',
  'Solusi Masalah & FAQ (Problem Solving / Help)',
] as const
