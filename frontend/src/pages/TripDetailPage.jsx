import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { TRIP_QUERY } from '../graphql/queries'
import { formatDateRange, formatFullDate } from '../lib/dates'

function StopRow({ stop }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{stop.name}</span>
        {stop.startTime ? <span className="text-sm text-muted">{stop.startTime}</span> : null}
      </div>
      {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
    </li>
  )
}

function DayCard({ day }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="font-display text-lg text-ink">{formatFullDate(day.date)}</h3>
      {day.stops.length === 0 ? (
        <p className="text-sm text-muted">No stops yet for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {day.stops.map((stop) => (
            <StopRow key={stop.id} stop={stop} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function TripDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = useQuery(TRIP_QUERY, { variables: { id } })

  const trip = data?.trip

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link to="/trips" className="text-sm font-semibold text-muted hover:text-ink">
          ← Back to trips
        </Link>

        {loading ? <p className="text-muted">Loading trip…</p> : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
        {!loading && !error && !trip ? <p className="text-muted">Trip not found.</p> : null}

        {trip ? (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="font-display text-2xl text-ink text-balance">{trip.title}</h1>
              <p className="text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
            </header>

            <div className="flex flex-col gap-4">
              {trip.days.length === 0 ? (
                <p className="text-muted">No days added yet.</p>
              ) : (
                trip.days.map((day) => <DayCard key={day.id} day={day} />)
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
