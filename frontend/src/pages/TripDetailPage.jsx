import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { TRIP_QUERY } from '../graphql/queries'
import { ADD_DAY_MUTATION } from '../graphql/mutations'
import { formatDate, formatDateRange, enumerateDates } from '../lib/dates'
import { DayCard } from '../components/DayCard'

export function TripDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = useQuery(TRIP_QUERY, { variables: { id } })
  const [addingDate, setAddingDate] = useState(null)
  const [runAddDay] = useMutation(ADD_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })

  const trip = data?.trip

  async function handleAddDay(date) {
    setAddingDate(date)
    await runAddDay({ variables: { tripId: id, date } })
    setAddingDate(null)
  }

  const existingDates = new Set(trip?.days.map((day) => day.date) ?? [])
  const missingDates = trip
    ? enumerateDates(trip.startDate, trip.endDate).filter((date) => !existingDates.has(date))
    : []

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
                trip.days.map((day) => <DayCard key={day.id} day={day} tripId={id} />)
              )}
            </div>

            {missingDates.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-muted">Start a day</h2>
                <div className="flex flex-wrap gap-2">
                  {missingDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      disabled={addingDate === date}
                      onClick={() => handleAddDay(date)}
                      className="cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
                    >
                      {addingDate === date ? 'Adding…' : formatDate(date)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
