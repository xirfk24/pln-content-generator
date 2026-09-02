# PLN Content Management System

AI-Powered Content Management & Intelligence System — a full-stack internal web application for managing the complete content lifecycle: from idea, planning, approval workflow, publishing, performance monitoring, analytics, to AI-assisted recommendations.

> **AI Assistant — Demo Mode**: all AI features currently use a `MockAIProvider` that simulates realistic, input-aware responses. No external AI service is connected. See [AI Architecture](#ai-architecture-mock--future-gemini).

## Features

### Content Management
- **Content Ideas** — CRUD, search/filter, convert idea into a content plan (preserves source reference), AI idea generator
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
- Engagement rate: `(Likes + Comments + Shares + Saves) / Reach × 100` (documented in UI tooltips; reach=0 guarded)
- **Dashboard** — real DB data, filterable (date range, platform, pillar, status): content KPIs, performance KPIs, status pie, platform bars, planned-vs-published trend, top content
- **Analytics Overview** — per-platform charts, per-pillar table, monthly realization rate
- **Performance Analytics** — top content ranking by views / engagement rate / likes / shares
- **Reports** — filtered table preview + CSV export (Excel-compatible, BOM)

### AI Assistant (Demo Mode — Mock Provider)
1. **Idea Generator** — contextual ideas by pillar/platform/audience; save as draft or create content
2. **Content Generator** — title/hook/brief/caption/CTA from topic parameters
3. **Content Improvement** — input-aware suggestions (checks CTA, hook, length, emoji, numbers) with "Apply to Brief"
4. **AI Review** — pre-submit quality scoring (5 categories, issues, suggestions); advisory only
5. **Performance Analysis** — analyzes the current filtered analytics snapshot
6. **Recommendations** — one click turns a recommendation into a Content Idea (completes the analytics → idea loop)

All AI interactions are logged to `ai_requests` / `ai_outputs`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Recharts, lucide-react |
| Backend | Next.js Route Handlers + Server Actions (services layer) |
| Database | PostgreSQL on Supabase |
| Auth | Supabase Auth (cookie-based session via `@supabase/ssr`) |
| AI | Provider abstraction — `MockAIProvider` (Gemini-ready) |
| Deployment | Vercel |

## Architecture

```
UI (client components / pages)
  ↓ fetch
API Route Handlers (/src/app/api/**)
  ↓
Services (/src/services/**)  ← all business logic, Supabase queries
  ↓
Supabase (PostgreSQL + RLS)

AI path:
UI → API route → AIProvider interface → MockAIProvider
                                     (future: GeminiAIProvider)
```

Key directories:

```
src/
├── app/                  # pages + API routes
├── components/           # ui/, layout/, workflow/, analytics/, ai/, admin/
├── lib/
│   ├── supabase/         # server & browser clients
│   ├── auth/             # session middleware, permissions, page guards
│   ├── ai/               # AIProvider interface + MockAIProvider
│   └── utils/            # cn, dates, engagement rate, week number
├── services/             # content, content-ideas, content-details,
│                         # approval, publications, metrics,
│                         # analytics, admin, ai-logging
├── types/                # domain types + database types
└── constants/            # statuses, workflow maps, labels, formulas
supabase/
├── schema.sql            # tables, RLS, triggers, indexes
└── seed.sql              # realistic Indonesian demo data
```

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — full_name, role (ADMIN/STAFF/REVIEWER/APPROVER), is_active |
| `pillars`, `categories`, `platforms` | Master data |
| `content_ideas` | Ideas (DRAFT/SELECTED/CONVERTED/ARCHIVED) |
| `contents` | Single source of truth; 10 lifecycle statuses; `source_idea_id` traceability |
| `publications` | Per-platform publishing (planned vs actual date, URL, status) |
| `performance_metrics` | Metrics per publication per recorded date |
| `approval_histories` | Full workflow audit trail (action, from/to status, comment, performer) |
| `ai_requests` / `ai_outputs` | AI interaction logs |

Row-Level Security policies enforce read/write rules per role. `updated_at` triggers on mutable tables. Audit fields (`created_by`, `updated_by`, timestamps) on relevant tables.

## User Roles

| Role | Key permissions |
|---|---|
| ADMIN | Everything: user & master data management, all content, workflow, analytics, AI |
| STAFF | Create ideas/content, submit/resubmit, publications, metrics, dashboards, AI |
| REVIEWER | Review submitted content, request revision, approval history |
| APPROVER | Final approval / rejection, approval history |

Authorization is enforced server-side (route handlers, services with role checks, RLS, and server-side page guards for `/admin`). The sidebar nav is also filtered per role (UX only, not the security boundary).

## Setup Instructions

### Prerequisites
- Node.js 18+
- A Supabase project

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   SUPABASE_SERVICE_ROLE_KEY=<your service role key>
   GEMINI_API_KEY=          # future, leave empty
   ```

3. **Create the database schema** — in Supabase Dashboard → SQL Editor, run in order:
   - `supabase/schema.sql` — tables, RLS, triggers, indexes
   - `supabase/seed.sql` — demo content data

4. **Create demo accounts** (uses the Supabase Admin API — safe, unlike manual `auth.users` inserts which corrupt the auth schema):

   ```bash
   bash scripts/create-demo-users.sh
   ```

   All passwords: `demo1234`.

   | Email | Name | Role |
   |---|---|---|
   | `admin@pln.co.id` | Admin Utama | ADMIN |
   | `staff1@pln.co.id` | Budi Santoso | STAFF |
   | `staff2@pln.co.id` | Siti Rahayu | STAFF |
   | `reviewer@pln.co.id` | Agus Wibowo | REVIEWER |
   | `approver@pln.co.id` | Dewi Kusuma | APPROVER |

   The demo users share UUIDs with the seeded `profiles` rows, so all `created_by` / `performed_by` references resolve correctly.

5. **Run the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and sign in.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Service role key — never exposed to client |
| `GEMINI_API_KEY` | future | Gemini API key — only when integrating Gemini |

## AI Architecture (Mock → Future Gemini)

All AI calls go through one interface (`src/lib/ai/types.ts`):

```typescript
interface AIProvider {
  generateIdeas(...)
  generateContent(...)
  improveContent(...)
  reviewContent(...)
  analyzePerformance(...)
  generateRecommendations(...)
}
```

The factory in `src/lib/ai/index.ts` currently returns `MockAIProvider`:

```typescript
// TODO: Replace MockAIProvider with GeminiAIProvider.
export function getAIProvider(): AIProvider {
  return new MockAIProvider()
}
```

**To integrate Gemini later:** create `src/lib/ai/gemini-provider.ts` implementing `AIProvider` (calling the Gemini API with `GEMINI_API_KEY` server-side), then change the factory to return `GeminiAIProvider`. No UI or service changes are needed — the UI never knows which provider is active.

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Add environment variables (Project → Settings → Environment Variables).
4. Deploy. Route handlers run as serverless functions automatically.

## Verification Commands

```bash
npx tsc --noEmit   # typecheck
npm run lint       # eslint
npm run build      # production build
npm run dev        # dev server
```
