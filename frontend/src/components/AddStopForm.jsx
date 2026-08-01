import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { ADD_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { MapPicker } from './MapPicker'
import { PlusIcon, XIcon } from './Icons'

export function AddStopForm({ dayId, tripId, onDone }) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [runAddStop, { loading, error }] = useMutation(ADD_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (lat == null || lng == null) return
    await runAddStop({ variables: { dayId, name, location: { lat, lng } } })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-3">
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
        <MapPicker lat={lat} lng={lng} onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || lat == null || lng == null}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {loading ? 'Adding…' : 'Add stop'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
          Cancel
        </button>
      </div>
    </form>
  )
}
