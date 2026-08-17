import { Suspense, lazy, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { ADD_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { useTranslation } from '../hooks/useTranslation'
import { PlusIcon, XIcon } from './Icons'

const MapPicker = lazy(() => import('./MapPicker').then((module) => ({ default: module.MapPicker })))

export function AddStopForm({ dayId, tripId, onDone }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [isOptional, setIsOptional] = useState(false)
  const [runAddStop, { loading, error }] = useMutation(ADD_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (lat == null || lng == null) return
    await runAddStop({
      variables: {
        dayId,
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
        <label className="text-xs font-semibold text-ink">{t('stopForm.name.label')}</label>
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">{t('stopForm.location.label')}</label>
        <Suspense fallback={<div className="flex h-40 items-center justify-center text-sm text-muted">{t('common.loadingMap')}</div>}>
          <MapPicker lat={lat} lng={lng} onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">{t('stopForm.startTime.label')}</label>
        <input
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink">{t('stopForm.notes.label')}</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
      </div>

      <div className="flex gap-4">
        <span className="text-xs font-semibold text-ink">{t('stopForm.thisFieldIs')}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(event) => setIsImportant(event.target.checked)}
            className="cursor-pointer"
          />
          {t('stopForm.important')}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isOptional}
            onChange={(event) => setIsOptional(event.target.checked)}
            className="cursor-pointer"
          />
          {t('stopForm.optional')}
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || lat == null || lng == null}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {loading ? t('common.adding') : t('stopForm.addStop')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
