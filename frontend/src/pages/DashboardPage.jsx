import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { MY_TRIPS_QUERY } from '../graphql/queries'
import { TripCard } from '../components/TripCard'
import { NewTripForm } from '../components/NewTripForm'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const { data, loading, error } = useQuery(MY_TRIPS_QUERY)

  const trips = data?.myTrips ?? []

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl text-ink">VoyApp</p>
            {user?.email ? <p className="text-sm text-muted">{user.email}</p> : null}
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink cursor-pointer"
          >
            Log out
          </button>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-2xl text-ink">Your trips</h1>
            {isCreating ? null : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink cursor-pointer"
              >
                New trip
              </button>
            )}
          </div>

          {isCreating ? (
            <NewTripForm onCreated={() => setIsCreating(false)} onCancel={() => setIsCreating(false)} />
          ) : null}

          {loading ? <p className="text-muted">Loading your trips…</p> : null}
          {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

          {!loading && !error && trips.length === 0 ? (
            <p className="text-muted">No trips yet — create your first one above.</p>
          ) : null}

          {trips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
