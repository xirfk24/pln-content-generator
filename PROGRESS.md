# PROJECT PROGRESS NOTES
Project: PLN AI-Powered Content Management & Intelligence System
Dir: /home/xirfk/pln-content-generator
Stack: Next.js 14.2.35 (App Router, src dir, @/* alias), TypeScript, Tailwind, Supabase (@supabase/ssr), lucide-react, cva
Node: v24.12.0

## STATUS: ALL PHASES COMPLETE (build + lint passing)

## PHASE 6 DONE:
- Role-based sidebar: src/components/layout/sidebar.tsx REWRITTEN
  - Nav items carry optional roles[]; Administration group = ADMIN only; My Tasks = ADMIN/STAFF; Approval = ADMIN/REVIEWER/APPROVER
  - Fetches /api/auth/me for role, filters items client-side (UX only)
  - Desktop sidebar (collapsible) + mobile drawer (overlay + close), nav links close drawer
- MainLayout: mobile drawer state, main padding lg:pl-64/lg:pl-16, responsive p-4 md:p-6
- Server-side page guard: src/lib/auth/guard.ts (requireRolePage(roles) — redirects /login or /unauthorized)
- /admin/layout.tsx: requireRolePage(['ADMIN']) + MainLayout — real protection for all admin pages
- Admin module (previously missing pages, now real):
  - src/services/admin.ts: requireAdmin helper; listMaster/createMaster/updateMaster/deleteMaster for pillars/categories/platforms; listUsers; updateUserRole
  - API: /api/admin/{pillars,categories,platforms} + [id] (GET/POST/PUT/DELETE, admin-only), /api/admin/users (GET, PUT role/is_active/full_name)
  - src/components/admin/master-data-manager.tsx: generic CRUD table + add/edit dialogs + delete confirm
  - Pages: /admin/pillars, /admin/categories, /admin/platforms (use MasterDataManager), /admin/users (role dropdown per user, active toggle)
- README.md REWRITTEN: full docs — features, stack, architecture diagram, schema table, roles, setup (incl. profile↔auth user linking note), env vars, AI mock→Gemini integration guide, deployment, verification commands
- Fixed: removed unused Button import in admin/users
- NOTE: disk was ~full (ENOSPC during build) — fixed by rm -rf .next; watch free space

## UI/UX DESIGN SYSTEM PASS (in progress):
- Design tokens: src/app/globals.css — semantic colors (surface/text/primary/success/warning/danger/info/neutral + soft/border variants), radius, shadows, spacing; light-first, Inter font (next/font/google, variable --font-inter)
- tailwind.config.ts: full token mapping (colors surface/ink/primary-*/success-*/etc, borderRadius, boxShadow, spacing)
- src/app/layout.tsx: Inter font
- UI primitives rethemed to tokens: button (primary=blue, focus ring, outline), badge (semantic soft variants), card, input (border-strong, focus ring)
- NEW src/components/ui/status-badge.tsx — status + icon + semantic variant, kind: content|idea|publication (never color-only per accessibility)
- NEW src/components/ui/skeleton.tsx — Skeleton, SkeletonText, SkeletonTable, SkeletonCard, SkeletonKPI
- NEW src/components/ui/empty-state.tsx — icon + title + description + action
- Sidebar IA restructured per spec section 7: Content→Ideas, Planning→Calendar/Content Plan, Workflow→My Tasks/Review & Approval, Publishing→Publishing Queue, Analytics→Overview/Performance/AI Insights/Reports, AI→AI Assistant; active state = primary-soft
- StatusBadge swapped into: planning list, workflow tasks, workflow approval, content detail, reports, publishing tracker, content ideas list + idea detail
- Dashboard: skeleton loading instead of spinner; page header w/ description
- Login page: demo account autofill list
- TODO next: skeleton for other lists (ideas/planning/publishing), empty states upgrade, table sticky headers, My Tasks per spec section 12 polish, calendar week view + platform filter, review page content-first layout

## TEMPLATE ALIGNMENT (Content Plan PLN UID Jawa Barat 2026):
Source template: /home/xirfk/Pictures/rekap medsos/template.csv
- NEW supabase/migrate-template.sql (RUN IN SQL EDITOR after seed):
  - Inserts 26 coded pillars A-Z (aaaa0000-...-00a1..z6): A Bencana&Pemulihan, B TJSL, C EV/SPKLU, D EBT/REC, E Jabar Smile, F Instalasi Listrik, G K3L, H Kerja Sama, I Electrifying Lifestyle, J Lisdes, K Pasang Baru, L Pembangkit, M Keandalan, N Penghargaan, O Pengumuman/Transformasi/HSH, P Penjualan/Konsumsi, Q Penokohan, R PLN Mobile, S Promo, T Rekening/Tagihan, U Subsidi, V Surat Pembaca, W Tarif, X TMP, Y YBM, Z Lain-Lain
  - ALTER contents ADD day VARCHAR(10), reference TEXT
  - Re-maps old 6 generic pillars → coded ones (contents + content_ideas)
  - Backfills day from planned_date (Indonesian day names)
  - Old generic pillars left in place (commented-out DELETE)
- src/types/index.ts: Content + day, reference
- src/services/content.ts: getDayName() helper (Minggu..Sabtu); createContent/updateContent auto-set day from planned_date; accept reference
- Forms (planning/new + [id]/edit): Reference input; day preview under date picker
- Planning list table now matches template order: Week, Day, Date, Kategori, Platform, Pillar, Topic & Title, PIC, Status, Actions
- NEW src/services/topic-recap.ts + GET /api/analytics/topic-recap — count per pillar code (parses "A - Name" format), respects analytics filters
- Analytics Overview: new "Rekap Jumlah Topik (Kode A-Z)" card — grid of code chips w/ counts + total (mirrors template REKAP section)
- Build + tsc pass

## FINAL STATE:
- Register flow REMOVED (per user request). Demo accounts instead:
  - supabase/demo-users.sql — inserts auth.users + auth.identities (password crypt bf, all pw: demo1234) with IDs matching seeded profiles UUIDs (aaaaaaaa-...), + safety-net profiles upsert
  - Run order: schema.sql → seed.sql → demo-users.sql
  - Login page shows clickable demo account list (autofills email+password)
- All 6 phases complete
- All 6 phases complete
- npm run build ✓, npm run lint ✓, tsc ✓, dev ✓
- Full lifecycle: login → idea (AI gen) → plan (AI content/improve) → AI review → submit → review → approve → publish tracker → metrics → dashboard/analytics → AI insights → AI recommendations → new idea
- RBAC enforced: middleware (auth) + services (role checks) + RLS (db) + admin layout (page guard) + sidebar (ux)
- To demo: needs real Supabase creds in .env.local + schema.sql + seed.sql + auth users (see README setup steps 3-5)

## PHASE 1 DONE:
- Next.js + TS + Tailwind init
- Supabase clients: src/lib/supabase/server.ts (createClient, createServiceClient), src/lib/supabase/client.ts
- Auth middleware: src/middleware.ts -> src/lib/auth/middleware.ts (updateSession, protects /dashboard,/content,/calendar,/workflow,/publishing,/analytics,/reports,/ai,/admin; redirects logged-in from /login,/register)
- RBAC: src/lib/auth/permissions.ts (getCurrentUser, requireAuth, requireRole, PERMISSIONS map)
- Layout: src/components/layout/ (sidebar w/ full nav tree, header, main-layout w/ collapse)
- UI kit: src/components/ui/ (button, badge, card, input, label, textarea)
- Pages: /login, /logout, /unauthorized, /dashboard (demo static stats for now)
- Types: src/types/index.ts (UserRole, ContentStatus, IdeaStatus, PublicationStatus, ApprovalAction, all entity interfaces), src/types/database.ts (DB types)
- Constants: src/constants/index.ts (status labels/colors, formats, priorities, ENGAGEMENT_FORMULA)
- AI layer: src/lib/ai/types.ts (AIProvider interface: generateIdeas, generateContent, improveContent, reviewContent, analyzePerformance, generateRecommendations), src/lib/ai/mock-provider.ts (MockAIProvider w/ pillar+platform contextual maps), src/lib/ai/index.ts (getAIProvider factory)
- DB: supabase/schema.sql (pillars, categories, platforms, profiles, content_ideas, contents, publications, performance_metrics, approval_histories, ai_requests, ai_outputs + RLS + triggers + indexes)
- Seed: supabase/seed.sql (6 pillars, 5 categories, 7 platforms, 5 profiles, 5 ideas, 16 contents w/ all statuses, 9 publications, 6 metrics, 10 approval histories, AI logs)
- .env.example + .env.local (placeholders)
- README.md

## PHASE 2 DONE:
- Services:
  - src/services/content-ideas.ts ('use server': getPillars, getContentIdeas(filters), getContentIdeaById, createContentIdea, updateContentIdea, deleteContentIdea, convertIdeaToContent -> creates content + marks idea CONVERTED)
  - src/services/content.ts ('use server': getMasterData, getContents(filters), getContentById, createContent, updateContent, deleteContent, getContentsForCalendar)
  - src/services/content-details.ts ('use server': getContentWithDetails, getApprovalHistory, getPublications)
  - src/services/ai.ts (server wrappers for AI provider)
- API routes:
  - GET/POST /api/content-ideas
  - GET/PUT/DELETE /api/content-ideas/[id]
  - POST /api/content-ideas/[id]/convert
  - GET/POST /api/contents
  - GET/PUT/DELETE /api/contents/[id]
  - GET /api/contents/[id]/details (content + approvals + publications)
  - GET /api/contents/calendar?date_from&date_to
  - GET /api/master-data (pillars, categories, platforms)
  - POST /api/ai/generate-content
- Pages:
  - /content/layout.tsx (MainLayout wrapper)
  - /content/ideas (list w/ search + status filter)
  - /content/ideas/new (create form)
  - /content/ideas/ai (AI idea generator: params form -> MockAIProvider -> save as draft / create content / copy)
  - /content/ideas/[id] (detail w/ convert button)
  - /content/ideas/[id]/edit
  - /content/planning (table list: search, status/pillar/platform filters)
  - /content/planning/new (create w/ AI generate brief; Suspense-wrapped useSearchParams for ?idea= prefill)
  - /content/[id] (detail: overview, brief, publications w/ metrics + engagement rate, approval timeline)
  - /content/[id]/edit
  - /content/calendar (month grid, prev/next/today, status colors, legend)

## KEY PATTERNS:
- Client pages fetch from /api/* routes; API routes call services; services use supabase server client
- Next 14: params are Promise in route handlers + pages (use `use(params)` or `await params`)
- useSearchParams needs Suspense boundary for static prerender
- eslint strict: no unused vars, no `any`, exhaustive-deps warnings fixed w/ eslint-disable comments
- Badge variant union type cast needed: `as "default" | "secondary" | ...`

## FIXES APPLIED:
- Duplicate lucide import in ideas/ai page
- useState(() => fetch()) bug in ideas/new -> useEffect
- Suspense for planning/new useSearchParams
- Removed unused imports everywhere

## PHASE 3 DONE:
- Workflow constants: src/constants/workflow.ts
  - STATUS_TRANSITIONS map (all 10 statuses)
  - WORKFLOW_ACTIONS: SUBMITTED, RESUBMITTED, REVIEWED (passthrough), REVISION_REQUESTED, REVIEW_APPROVED, FINAL_APPROVED, REJECTED — each w/ allowedRoles, allowedFromStatuses, toStatus, requiresComment
  - isValidTransition, canPerformAction helpers
  - APPROVAL_QUEUE_STATUSES per role
- Approval service: src/services/approval.ts
  - performWorkflowAction(contentId, action, comment): auth check → role check → transition check → update contents.status + updated_by → insert approval_histories (action, from_status, to_status, comment, performed_by). Returns typed WorkflowResult
  - getApprovalQueue(role), getMyTasks(profileId) — groups: drafts, revisions, readyToPublish, submitted
- Publications service: src/services/publications.ts (getPublications w/ filters + content join, getPublicationsByContent, createPublication, updatePublication, deletePublication; validates status enum + URL)
- API routes:
  - POST /api/contents/[id]/workflow {action, comment}
  - GET /api/workflow/tasks
  - GET /api/workflow/approval-queue (returns queue + role)
  - GET/POST /api/publications, PUT/DELETE /api/publications/[id] (URL validation)
  - GET /api/auth/me, POST /api/auth/logout
- UI components:
  - src/components/ui/dialog.tsx (context-based Dialog, DialogContent w/ close, Header/Title/Description/Footer)
  - src/components/workflow/workflow-action-button.tsx (handles required-comment actions via dialog, loading/error states)
- Pages:
  - /workflow/layout.tsx, /workflow/tasks (4 task groups w/ submit/resubmit/publish links)
  - /workflow/approval (role-aware queue: reviewer→PENDING_REVIEW approve/revision, approver→APPROVED final-approve/reject; latest workflow comment shown)
  - /publishing/layout.tsx + /publishing (tracker table: content link, platform, planned vs actual w/ overdue/late coloring, URL, status badge, quick "Publish" action, add/edit dialogs, delete)
  - Content detail page: added "Workflow Actions" card (role+status aware: submit, resubmit+edit, review approve/revision, final approve/reject, record publication link)
  - Header: fetches /api/auth/me — shows real full_name + role label, working logout via /api/auth/logout

## PHASE 4 DONE:
- recharts@3.10.1 installed
- Metrics service: src/services/metrics.ts
  - getMetricsByPublication, saveMetrics (validates numeric >= 0; upsert by publication_id+recorded_at), deleteMetrics
  - API: GET/POST /api/publications/[id]/metrics
- Analytics service: src/services/analytics.ts (all filters: date_from/to, platform_id, pillar_id, status)
  - getDashboardKPIs (content counts per status + performance totals + avg engagement rate)
  - getContentStatusBreakdown, getPlatformPerformance (views/likes/comments/shares/saves/reach/engagementRate per platform)
  - getPillarPerformance (contentCount, publishedCount, views, avgViews, totalEngagement, avgEngagementRate)
  - getMonthlyTrend (planned/published/realizationRate/views/likes/engagementRate per month)
  - getTopContent (rankable by views/engagementRate/likes/shares, top N)
  - NOTE: tsconfig target < es2015 — must use Array.from(map.entries()) not for..of on maps
- API routes:
  - GET /api/dashboard (kpis + statusBreakdown + platformPerformance + monthlyTrend + topContent)
  - GET /api/analytics (kpis + platform + pillar + monthly + topContent w/ ?metric= ranking)
  - GET /api/reports?format=csv (CSV export w/ BOM for Excel; JSON otherwise)
- Shared filter bar: src/components/analytics/filter-bar.tsx (date range, platform, pillar, status; clear button)
- Pages:
  - /dashboard REWRITTEN: real DB data, FilterBar, KPI cards (total/views/engagement/pending), likes/comments/shares cards, PieChart status, BarChart platform views, LineChart planned vs published vs views, Top 5 content w/ links
  - /analytics (overview): platform BarCharts (views+likes+shares; engagement rate), pillar performance table, monthly planned vs published chart + realization rate table
  - /analytics/performance: top content table, rank metric switcher (views/engagement/likes/shares), all metrics columns
  - /reports: FilterBar + table preview + Export CSV button (downloads via /api/reports?format=csv)
  - /publishing: metrics dialog added (icon button on PUBLISHED pubs) — input views/likes/comments/shares/saves/reach/date, live engagement rate preview, upsert per date
- Layouts added: /analytics/layout.tsx, /reports/layout.tsx (MainLayout)

## PHASE 5 DONE:
- AI logging: src/services/ai-logging.ts (logAIRequest — writes ai_requests + ai_outputs, non-blocking)
- API routes (all log to ai_requests/ai_outputs):
  - POST /api/ai/review-content {content, platform, targetAudience}
  - POST /api/ai/improve-content {content, improvementType, platform}
  - POST /api/ai/analyze-performance {date_from, date_to, platform_id, pillar_id, status} — builds real analytics snapshot (KPIs, top content, byPlatform, byPillar) then calls provider
  - POST /api/ai/recommendations — builds historical data (top by engagement, underperforming pillars <3%, recent formats) then calls provider
- MockAIProvider UPGRADED:
  - improveContent: contextual (checks word count, emoji, question, CTA, numbers; adds hook/CTA accordingly; suggestions+improvements lists)
  - reviewContent: contextual scoring (clarity by length, tone w/ emoji, audience by defined?, CTA detection, engagement via question+numbers) → overall score, 5 categories w/ status, potentialIssues, suggestions
  - fixed stray unicode char in opportunities
- Shared UI components:
  - src/components/ai/ai-result-card.tsx (AIResultCard: title, Demo Mode badge, timestamp, regenerate/copy/dismiss buttons; AIError)
  - src/components/ai/ai-review-panel.tsx (score circle, category list, issues, suggestions)
  - src/components/ai/ai-improve-panel.tsx (type selector, improved content, Apply to Brief button, improvements list)
- Pages:
  - /ai: feature hub (4 quick links), Generate Recommendations → recommendation cards (title, reason, pillar/format/platform badges, confidence, expected objective) w/ "Create Content Idea" button → creates idea via API, tracks created, link to /content/ideas
  - /analytics/insights: FilterBar + Analyze with AI → summary card + Key Findings card + Possible Reasons/Recommended Actions/Opportunities color-coded sections, staged loading text
  - /content/[id]: AI Review card added (pre-submit quality check, advisory only)
  - /content/[id]/edit: AIImprovePanel under brief (Apply to Brief fills textarea)
- tsconfig: added "target": "es2017" (needed for /u regex flag + map spread; remember stale tsbuildinfo cache caused false errors — rm tsbuildinfo if weird TS errors appear)

## TODO PHASE 6 (NEXT):
- Responsive polish, empty states, error handling
- Role-based nav filtering in sidebar
- README update
- Final testing

## VERIFICATION COMMANDS:
- npx tsc --noEmit
- npm run build
- npm run lint
