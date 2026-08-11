import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeftIcon, LogOutIcon, UserIcon } from '../components/Icons'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg px-4 pb-8 pt-4 sm:px-8 sm:pt-6 lg:px-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            aria-label="Back to your trips"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg p-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="font-display text-2xl text-ink">Profile</h1>
        </header>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <UserIcon size={28} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user?.email ?? 'Loading…'}</p>
              <p className="text-sm text-muted">VoyApp account</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:justify-start sm:border-none sm:px-0 sm:py-0"
          >
            <LogOutIcon size={16} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
