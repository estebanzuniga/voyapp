import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <h1 className="font-display text-3xl text-ink">
        {user?.email ? `Welcome, ${user.email}` : 'Welcome to VoyApp'}
      </h1>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink"
      >
        Log out
      </button>
    </div>
  )
}
