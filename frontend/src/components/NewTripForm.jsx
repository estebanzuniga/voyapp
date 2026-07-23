import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { CREATE_TRIP_MUTATION } from '../graphql/mutations'
import { MY_TRIPS_QUERY } from '../graphql/queries'

export function NewTripForm({ onCreated, onCancel }) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [runCreateTrip, { loading, error }] = useMutation(CREATE_TRIP_MUTATION, {
    refetchQueries: [{ query: MY_TRIPS_QUERY }],
    awaitRefetchQueries: true,
  })

  const currentYear = new Date().getFullYear()

  async function handleSubmit(event) {
    event.preventDefault()
    await runCreateTrip({ variables: { title, startDate, endDate } })
    onCreated()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-semibold text-ink">
          Trip title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={`Eurotrip ${currentYear}`}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="startDate" className="text-sm font-semibold text-ink">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink focus:outline-2 focus:outline-accent"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="endDate" className="text-sm font-semibold text-ink">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            required
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink focus:outline-2 focus:outline-accent"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Creating…' : 'Create trip'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 font-semibold text-muted hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
