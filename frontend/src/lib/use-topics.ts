import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { PLN_TOPIC_OPTIONS } from '@/constants'

/**
 * Daftar Topik Konten resmi dari DB (dikelola admin di /admin/topics),
 * sebagai label lengkap "KODE - Nama" dari kolom code & name yang terpisah.
 * Fallback ke daftar statis selagi memuat / jika fetch gagal / kosong,
 * supaya form & filter tetap berfungsi tanpa bergantung pada network.
 */
export function useTopics(): string[] {
  const [topics, setTopics] = useState<string[]>(PLN_TOPIC_OPTIONS as unknown as string[])

  useEffect(() => {
    let alive = true
    apiFetch('/api/master-data')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items: Array<{ code?: string; name: string; label?: string }> = data?.topics || []
        const labels = items.map((t) =>
          t.label ?? (t.code ? `${t.code} - ${t.name}` : t.name)
        )
        if (alive && labels.length > 0) setTopics(labels)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return topics
}
