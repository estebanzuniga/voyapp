import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { ADD_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'

export function AddStopForm({ dayId, tripId, onDone }) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [runAddStop, { loading, error }] = useMutation(ADD_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    await runAddStop({
      variables: { dayId, name, location: { lat: Number(lat), lng: Number(lng) } },
    })
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

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1 w-0">
          <label className="text-xs font-semibold text-ink">Latitude</label>
          <input
            type="number"
            step="any"
            required
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 w-0">
          <label className="text-xs font-semibold text-ink">Longitude</label>
          <input
            type="number"
            step="any"
            required
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {loading ? 'Adding…' : 'Add stop'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
