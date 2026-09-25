// Self-check grouping notifikasi publikasi per konten (tanpa framework).
// Jalankan: ./node_modules/.bin/jiti src/lib/pub-notifs.selfcheck.mjs  (dari folder frontend/)
import assert from 'node:assert/strict'
import { buildPublicationNotifications } from './pub-notifs.ts'

const ctx = {
  todayStr: '2026-09-25',
  tomorrowStr: '2026-09-26',
  isAdmin: false,
  formatDate: (d) => d,
}
const pub = (over) => ({
  id: 'x',
  updated_at: '2026-09-24T00:00:00Z',
  ...over,
})

// 1) Konten 3 platform yang sudah published → TEPAT SATU notif PUBLISHED,
//    description memuat semua platform (dulu: 3 notif numpuk)
const c1 = [
  pub({ id: 'a', content_id: 'c1', status: 'PUBLISHED', platform: { name: 'Instagram' } }),
  pub({ id: 'b', content_id: 'c1', status: 'PUBLISHED', platform: { name: 'TikTok' } }),
  pub({ id: 'c', content_id: 'c1', status: 'PUBLISHED', platform: { name: 'Facebook' } }),
]
const out1 = buildPublicationNotifications(c1, ctx)
assert.equal(out1.length, 1)
assert.equal(out1[0].kind, 'done')
assert.equal(out1[0].type, 'PUBLISHED')
for (const name of ['Instagram', 'TikTok', 'Facebook']) {
  assert.ok(out1[0].description.includes(name), `description harus memuat ${name}`)
}

// 2) 2 published + 1 lewat jadwal → 1 PUBLISHED + 1 OVERDUE (tetap per jenis)
const c2 = [
  pub({ id: 'd', content_id: 'c2', status: 'PUBLISHED', platform: { name: 'Instagram' } }),
  pub({ id: 'e', content_id: 'c2', status: 'PUBLISHED', platform: { name: 'TikTok' } }),
  pub({ id: 'f', content_id: 'c2', status: 'PLANNED', planned_publish_date: '2026-09-20', platform: { name: 'Facebook' } }),
]
const out2 = buildPublicationNotifications(c2, ctx)
assert.deepEqual(out2.map((n) => n.kind).sort(), ['done', 'overdue'])
assert.equal(out2.find((n) => n.kind === 'overdue').needsAction, true)
assert.ok(out2.find((n) => n.kind === 'overdue').description.includes('Facebook'))
assert.ok(!out2.find((n) => n.kind === 'overdue').description.includes('Instagram'))

// 3) Cancel multi platform (mix CANCELLED/CANCEL) → 1 CANCELLED + alasan
const c3 = [
  pub({ id: 'g', content_id: 'c3', status: 'CANCELLED', cancel_reason: 'bahan kurang', platform: { name: 'Instagram' } }),
  pub({ id: 'h', content_id: 'c3', status: 'CANCEL', platform: { name: 'TikTok' } }),
]
const out3 = buildPublicationNotifications(c3, ctx)
assert.equal(out3.length, 1)
assert.equal(out3[0].kind, 'cancel')
assert.ok(out3[0].description.includes('Alasan: bahan kurang'))
assert.ok(out3[0].description.includes('Instagram') && out3[0].description.includes('TikTok'))

// 4) Jadwal hari ini / besok → masing-masing 1 per konten
const c4 = [
  pub({ id: 'i', content_id: 'c4', status: 'PLANNED', planned_publish_date: ctx.todayStr, platform: { name: 'Instagram' } }),
  pub({ id: 'j', content_id: 'c4', status: 'PLANNED', planned_publish_date: ctx.todayStr, platform: { name: 'TikTok' } }),
]
const out4 = buildPublicationNotifications(c4, ctx)
assert.equal(out4.length, 1)
assert.equal(out4[0].kind, 'today')
assert.equal(out4[0].needsAction, true)

const out5 = buildPublicationNotifications(
  [pub({ id: 'k', content_id: 'c5', status: 'PLANNED', planned_publish_date: ctx.tomorrowStr })],
  ctx
)
assert.equal(out5.length, 1)
assert.equal(out5[0].kind, 'tomorrow')
assert.equal(out5[0].needsAction, false)
assert.ok(out5[0].description.includes('1 platform')) // fallback tanpa nama platform

// 5) Konten berbeda tetap dapat notif terpisah
const both = buildPublicationNotifications([...c1, ...c4], ctx)
assert.equal(both.filter((n) => n.kind === 'done').length, 1)
assert.equal(both.filter((n) => n.kind === 'today').length, 1)

// 6) DELAYED dengan jadwal masa depan tetap masuk bucket overdue
const out6 = buildPublicationNotifications(
  [pub({ id: 'l', content_id: 'c6', status: 'DELAYED', planned_publish_date: ctx.tomorrowStr })],
  ctx
)
assert.equal(out6.length, 1)
assert.equal(out6[0].kind, 'overdue')

console.log('pub-notifs selfcheck OK')
