# PLN Content Management System

AI-Powered Content Management & Intelligence System — full-stack internal web application for managing the complete content lifecycle: planning, approval workflow, publishing, performance monitoring, analytics, and AI-assisted recommendations.

Stack: **Vite + React** frontend, **Go (gin + pgx)** backend, **Supabase** (Postgres + Auth). Migration story & setup details: [MIGRATION.md](./MIGRATION.md).

## Quick Start (dev)

```bash
# backend — http://localhost:8080
cd backend
cp .env.example .env        # isi DATABASE_URL + SUPABASE_JWT_SECRET
go run ./cmd/server

# frontend — http://localhost:3001 (proxy /api -> :8080)
cd frontend
cp .env.example .env.local  # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Login memakai akun Supabase yang sama seperti sebelumnya (auth tidak berpindah). Role & permission (`ADMIN/STAFF/REVIEWER/APPROVER`) di-enforce di middleware Go.

## Features

### Content Management
- **Content Planning** — full CRUD with search, status/pillar/platform filters; fields: topic, title, pillar, category, platform, format, brief, target audience, planned date/week, PIC, priority
- **Content Calendar** — month grid with status color-coding, prev/next/today navigation, status legend

### Approval Workflow (RBAC-enforced, server-side)
- Controlled status transitions (`DRAFT → … → PUBLISHED`)
- Staff submit/resubmit; Reviewer review-approve/request revision; Approver final-approve/reject
- Every action records an audit row (`approval_histories`) rendered as a timeline
- Role-aware **My Tasks** and **Approval Queue** pages
- Workflow action cards on content detail, context-aware by role + status

### Publishing Tracker
- One content → many publications (per platform)
- Planned vs actual publish date (overdue/late highlighting), published URL, status (PLANNED/PUBLISHED/DELAYED/CANCELLED)
- Quick "Publish" action; add/edit/delete dialogs

### Performance & Analytics
- Manual performance metrics per publication (views, likes, comments, shares, saves, reach) — upsert per date, numeric validation
- Engagement rate: `(Likes + Comments + Shares + Saves) / Reach × 100`
- **Dashboard** — real DB data, filterable (date range, platform, pillar, status): content KPIs, performance KPIs, status pie, platform bars, planned-vs-published trend, top content
- **Analytics Overview** — per-platform charts, per-pillar table, monthly realization rate
- **Topic Recap** — pillar-code (A–Z) recap table matching the ops spreadsheet template

### Reports
- Filterable content report; CSV export (Excel-friendly, BOM + escaped)

### Admin
- Master data CRUD: pillars, categories, platforms
- User management: roles, active status

### AI (Mock Mode)
> **Demo Mode**: all AI features use a mock provider that simulates realistic, input-aware responses. No external AI service connected. Swap provider in `backend/internal/ai/` (interface mirrors the old `AIProvider`).
- Content generator (structured: title/hook/brief/caption/CTA/hashtags)
- Content improvement + review scoring (clarity/tone/audience/CTA/engagement)
- Performance analysis + recommendations (logged to `ai_requests`/`ai_outputs`)

## Repo Layout

```
backend/    Go REST API (gin, pgx, golang-jwt)
frontend/   React SPA (Vite, react-router, Tailwind, shadcn-style UI)
supabase/   DB schema, migrations, seed, demo-user script
```

## Architecture Notes

- **Auth**: Supabase Auth (supabase-js client-side). Go verifies the access token (HS256 JWT, `SUPABASE_JWT_SECRET`) and loads `profiles.role`. Admin routes require `ADMIN`.
- **DB access**: Go connects directly to Postgres via `DATABASE_URL` (pgx). RLS is bypassed (postgres user) — permission enforcement lives in Go middleware. Keep `DATABASE_URL` secret.
- **Workflow state machine**: 1:1 port of the old `src/constants/workflow.ts` (see `backend/internal/handlers/workflow.go`).

## History

- `legacy/nextjs` branch — full snapshot of the previous Next.js 14 app.
- Migration commit — see [MIGRATION.md](./MIGRATION.md).
