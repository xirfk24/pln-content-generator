# Migration: Next.js → Vite + Go

App direstrukturisasi jadi monorepo dua service. Branch `legacy/nextjs` = snapshot Next.js lengkap sebelum migrasi.

```
backend/   — Go (gin + pgx) REST API
frontend/  — React SPA (Vite + react-router)
supabase/  — schema + seed (tidak berubah)
src/       — kode Next.js lama (dipertahankan di branch legacy, dihapus setelah merge)
```

## Backend Go (`backend/`)

Stack: gin, pgx/v5, golang-jwt. Konek **langsung** ke Postgres Supabase (bukan lewat PostgREST).

Auth flow:
1. Frontend login via supabase-js (tetap pakai Supabase Auth)
2. Access token (JWT HS256) dikirim sebagai `Authorization: Bearer <token>`
3. Go verify pakai `SUPABASE_JWT_SECRET`, lalu load `profiles.role`
4. Route `/api/admin/*` require role ADMIN; route lain cukup token valid

Catatan: Go konek sebagai user DB postgres → RLS Postgres tidak aktif. Enforcement permission pindah ke middleware Go (`internal/auth/middleware.go`). Ganti `DATABASE_URL` ke connection string Supabase saat deploy.

Semua 29 endpoint Next API routes ter-port: contents (+workflow, details, calendar), publications, metrics, analytics (+topic-recap), dashboard, reports (JSON+CSV), master-data, admin (users, pillars, categories, platforms), AI (mock provider, ganti di `internal/ai/`).

Bug schema yang ditemukan saat porting:
- `categories` TIDAK punya kolom `icon` (cuma `platforms` yang punya) — kode lama tidak konsisten; query Go disesuaikan ke schema.

## Frontend Vite (`frontend/`)

- Pages/components/types/constants di-copy dari `src/`, path `@/` → `src/` (alias vite)
- `src/compat/next.tsx` — shim `next/link`, `useRouter`, `usePathname`, `useSearchParams` ke react-router (biar gak perlu rewrite semua pages)
- `src/lib/api.ts` — `apiFetch()`: fetch wrapper yang auto-attach Supabase access token
- `src/App.tsx` — routing + `RequireAuth` (redirect ke /login kalau gak ada session)
- Login/logout tetap via supabase-js
- Dev: proxy `/api` → `localhost:8080` (lihat `vite.config.ts`)

## Cara jalanin (dev)

```bash
# 1. backend
cd backend
cp .env.example .env  # isi DATABASE_URL + SUPABASE_JWT_SECRET
go run ./cmd/server

# 2. frontend
cd frontend
cp .env.example .env.local  # isi VITE_SUPABASE_URL + ANON_KEY
npm install
npm run dev  # http://localhost:3001
```

## Env vars

| Var | Di | Isi |
|---|---|---|
| `DATABASE_URL` | backend | Supabase → Settings → Database → connection string (URI) |
| `SUPABASE_JWT_SECRET` | backend | Supabase → Settings → API → JWT Secret |
| `VITE_SUPABASE_URL` | frontend | project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | anon/publishable key |

## Deploy

- Frontend: `npm run build` → static hosting (dist/)
- Backend: `go build -o server ./cmd/server` → VPS/container. Production: set `ALLOWED_ORIGINS` ke domain frontend, serve frontend dari Go atau CDN.
