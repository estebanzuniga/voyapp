import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { MY_TRIPS_QUERY } from '../graphql/queries'
import { TripCard } from '../components/TripCard'
import { NewTripForm } from '../components/NewTripForm'
import { Skeleton } from '../components/Skeleton'
import { PlusIcon, UserIcon } from '../components/Icons'

export function DashboardPage() {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const { data, loading, error } = useQuery(MY_TRIPS_QUERY)

  const trips = data?.myTrips ?? []

  return (
    <div className="min-h-dvh bg-bg px-4 pb-8 pt-4 sm:px-8 sm:pt-6 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl text-ink">VoyApp</p>
            {user?.email ? <p className="text-sm text-muted">{user.email}</p> : null}
          </div>
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent/10 text-accent hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <UserIcon size={18} />
          </Link>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-2xl text-ink">Your trips</h1>
            {isCreating ? null : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <PlusIcon size={18} />
                New trip
              </button>
            )}
          </div>

          {isCreating ? (
            <NewTripForm onCreated={() => setIsCreating(false)} onCancel={() => setIsCreating(false)} />
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 shadow-sm"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : null}
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
