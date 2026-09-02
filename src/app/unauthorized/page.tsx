export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-ink">403</h1>
        <p className="mt-4 text-lg text-ink-secondary">You do not have permission to access this page.</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  )
}
