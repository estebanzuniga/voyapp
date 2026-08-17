import { Suspense, lazy, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { UPDATE_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { CheckIcon, XIcon } from './Icons'

const MapPicker = lazy(() => import('./MapPicker').then((module) => ({ default: module.MapPicker })))

export function EditStopForm({ stop, tripId, onDone, onCancel }) {
  const [name, setName] = useState(stop.name)
  const [lat, setLat] = useState(stop.location.lat)
  const [lng, setLng] = useState(stop.location.lng)
  const [notes, setNotes] = useState(stop.notes ?? '')
  // The Time scalar round-trips as "HH:MM:SS" but <input type="time"> only
  // understands "HH:MM" - trim the seconds off going in, the backend adds
  // them back on save (parsing "HH:MM" as a time defaults seconds to :00).
  const [startTime, setStartTime] = useState(stop.startTime?.slice(0, 5) ?? '')
  const [isImportant, setIsImportant] = useState(stop.isImportant)
  const [isOptional, setIsOptional] = useState(stop.isOptional)
  const [runUpdateStop, { loading, error }] = useMutation(UPDATE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (lat == null || lng == null) return
    await runUpdateStop({
      variables: {
        id: stop.id,
        name,
        location: { lat, lng },
        notes: notes.trim() || null,
        startTime: startTime || null,
        isImportant,
        isOptional,
      },
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">Stop name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">Location</label>
        <Suspense fallback={<div className="flex h-40 items-center justify-center text-sm text-muted">Loading map…</div>}>
          <MapPicker lat={lat} lng={lng} onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">Start time (optional)</label>
        <input
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex gap-4">
        <span className="text-xs font-semibold text-ink">This field is: </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(event) => setIsImportant(event.target.checked)}
            className="cursor-pointer"
          />
          Important
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isOptional}
            onChange={(event) => setIsOptional(event.target.checked)}
            className="cursor-pointer"
          />
          Optional
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || lat == null || lng == null}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CheckIcon size={16} />
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
          Cancel
        </button>
      </div>
    </form>
  )
}
