import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { UPDATE_TRIP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { useTranslation } from '../hooks/useTranslation'
import { formatDate } from '../lib/dates'
import { CheckIcon, XIcon } from './Icons'

// `updateTrip` raises a GraphQLError with a machine-readable
// `extensions.code` (and, for the "shrink" case, the raw ISO `dates` that
// blocked it) precisely so this can show a message in the viewer's own
// language instead of the resolver's hardcoded English `error.message`.
// Anything without a code we recognize (a network error, an unrelated
// server error) still falls back to that raw message - better than nothing.
function describeUpdateTripError(error, t, locale) {
  const graphQLError = error?.errors?.[0]
  const code = graphQLError?.extensions?.code

  if (code === 'TRIP_TITLE_REQUIRED') return t('editTrip.error.titleRequired')
  if (code === 'TRIP_INVALID_DATE_RANGE') return t('editTrip.error.invalidDateRange')

  if (code === 'TRIP_SHRINK_BLOCKED') {
    const isoDates = graphQLError.extensions.dates ?? []
    const dates = isoDates.map((isoDate) => formatDate(isoDate, locale)).join(', ')
    const key = isoDates.length === 1 ? 'editTrip.error.shrinkBlockedOne' : 'editTrip.error.shrinkBlockedMany'
    return t(key, { dates })
  }

  return error?.message
}

export function EditTripForm({ trip, onDone, onCancel }) {
  const { t, locale } = useTranslation()
  const [title, setTitle] = useState(trip.title)
  const [startDate, setStartDate] = useState(trip.startDate)
  const [endDate, setEndDate] = useState(trip.endDate)
  const [runUpdateTrip, { loading, error }] = useMutation(UPDATE_TRIP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: trip.id } }],
    awaitRefetchQueries: true,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    await runUpdateTrip({ variables: { id: trip.id, title, startDate, endDate } })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="editTripTitle" className="text-sm font-semibold text-ink">
          {t('newTrip.title.label')}
        </label>
        <input
          id="editTripTitle"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="editTripStartDate" className="text-sm font-semibold text-ink">
            {t('newTrip.startDate.label')}
          </label>
          <input
            id="editTripStartDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink focus:outline-2 focus:outline-accent"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="editTripEndDate" className="text-sm font-semibold text-ink">
            {t('newTrip.endDate.label')}
          </label>
          <input
            id="editTripEndDate"
            type="date"
            required
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink focus:outline-2 focus:outline-accent"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{describeUpdateTripError(error, t, locale)}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CheckIcon size={18} />
          {loading ? t('common.saving') : t('stopForm.saveChanges')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={18} />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
