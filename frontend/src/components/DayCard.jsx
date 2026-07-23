import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { DELETE_DAY_MUTATION, DELETE_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { formatFullDate } from '../lib/dates'
import { AddStopForm } from './AddStopForm'

function StopRow({ stop, tripId }) {
  const [runDeleteStop, { loading }] = useMutation(DELETE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  return (
    <li className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{stop.name}</span>
        <div className="flex items-center gap-3">
          {stop.startTime ? <span className="text-sm text-muted">{stop.startTime}</span> : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => runDeleteStop({ variables: { id: stop.id } })}
            className="cursor-pointer text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </div>
      {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
    </li>
  )
}

export function DayCard({ day, tripId }) {
  const [isAddingStop, setIsAddingStop] = useState(false)
  const [runDeleteDay, { loading: deletingDay }] = useMutation(DELETE_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-ink">{formatFullDate(day.date)}</h3>
        <button
          type="button"
          disabled={deletingDay}
          onClick={() => runDeleteDay({ variables: { id: day.id } })}
          className="cursor-pointer text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60"
        >
          Delete day
        </button>
      </div>

      {day.stops.length === 0 ? (
        <p className="text-sm text-muted">No stops yet for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {day.stops.map((stop) => (
            <StopRow key={stop.id} stop={stop} tripId={tripId} />
          ))}
        </ul>
      )}

      {isAddingStop ? (
        <AddStopForm dayId={day.id} tripId={tripId} onDone={() => setIsAddingStop(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingStop(true)}
          className="cursor-pointer self-start text-sm font-semibold text-accent hover:underline"
        >
          + Add stop
        </button>
      )}
    </div>
  )
}
