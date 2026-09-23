import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { MainLayout } from '@/components/layout/main-layout'

import HomePage from './pages/home'
import LoginPage from './pages/login'
import LogoutPage from './pages/logout'
import UnauthorizedPage from './pages/unauthorized'
import DashboardPage from './pages/dashboard'
import ContentPlanningPage from './pages/content-planning'
import ContentNewPage from './pages/content-new'
import ContentCalendarPage from './pages/content-calendar'
import ContentDetailPage from './pages/content-detail'
import ContentEditPage from './pages/content-edit'
import AnalyticsPage from './pages/analytics'
import AnalyticsInsightsPage from './pages/analytics-insights'
import AnalyticsPerformancePage from './pages/analytics-performance'
import WorkflowApprovalPage from './pages/workflow-approval'
import WorkflowTasksPage from './pages/workflow-tasks'
import PublishingPage from './pages/publishing'
import AIPage from './pages/ai'
import ReportsPage from './pages/reports'
import RecapPage from './pages/recap'
import ContentImportPage from './pages/content-import'
import ContentTabunganPage from './pages/content-tabungan'
import AdminUsersPage from './pages/admin-users'
import AdminCategoriesPage from './pages/admin-categories'
import AdminPillarsPage from './pages/admin-pillars'
import AdminPlatformsPage from './pages/admin-platforms'
import AdminPeriodsPage from './pages/admin-periods'
import NotificationsPage from './pages/notifications'

function RequireAuth({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      // getSession() returns a session even when the access token is expired.
      // Supabase auto-refreshes on the next API call, but if the refresh
      // token itself is expired (or the user was signed out server-side),
      // we'd briefly render the dashboard with a dead session. Validate
      // the expiry here so a stale session is treated as unauthenticated.
      const session = data.session
      const isValid = session && session.expires_at
        ? session.expires_at * 1000 > Date.now()
        : false
      setAuthed(isValid)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ink-secondary">Loading...</p>
      </div>
    )
  }
  if (!authed) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AppLayout() {
  return (
    <RequireAuth>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </RequireAuth>
  )
}

// RequireRole membatasi halaman untuk ADMIN. Backend tetap sumber kebenaran
// (RequireRole("ADMIN") di Go), ini lapisan UX agar STAFF tidak melihat
// shell halaman admin sebelum request API ditolak.
function RequireRole({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAllowed(data?.user?.profile?.role === 'ADMIN')
        setChecking(false)
      })
      .catch(() => {
        setAllowed(false)
        setChecking(false)
      })
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ink-secondary">Loading...</p>
      </div>
    )
  }
  if (!allowed) {
    return <Navigate to="/unauthorized" replace />
  }
  return <>{children}</>
}

function AdminLayout() {
  return (
    <RequireRole>
      <Outlet />
    </RequireRole>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/content/planning" element={<ContentPlanningPage />} />
        <Route path="/content/tabungan" element={<ContentTabunganPage />} />
        <Route path="/content/planning/new" element={<ContentNewPage />} />
        <Route path="/content/calendar" element={<ContentCalendarPage />} />
        <Route path="/content/:id" element={<ContentDetailPage />} />
        <Route path="/content/:id/edit" element={<ContentEditPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/insights" element={<AnalyticsInsightsPage />} />
        <Route path="/analytics/performance" element={<AnalyticsPerformancePage />} />
        <Route path="/workflow/approval" element={<WorkflowApprovalPage />} />
        <Route path="/workflow/tasks" element={<WorkflowTasksPage />} />
        <Route path="/publishing" element={<PublishingPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/recap" element={<RecapPage />} />
        <Route path="/content/import" element={<ContentImportPage />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/pillars" element={<AdminPillarsPage />} />
          <Route path="/admin/platforms" element={<AdminPlatformsPage />} />
          <Route path="/admin/periods" element={<AdminPeriodsPage />} />
          <Route path="/periode-perencanaan" element={<AdminPeriodsPage />} />
        </Route>

        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
