import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DELETE_DAY_MUTATION, DELETE_STOP_MUTATION, DUPLICATE_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { useTranslation } from '../hooks/useTranslation'
import { formatFullDate, formatTime } from '../lib/dates'
import { AddStopModal } from './AddStopModal'
import { ConfirmDialog } from './ConfirmDialog'
import { DayMapModal } from './DayMapModal'
import { EditStopModal } from './EditStopModal'
import {
  ClockIcon,
  CopyIcon,
  GripVerticalIcon,
  MapIcon,
  MapPinIcon,
  NotesIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from './Icons'

const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&travelmode=walking'

function StopName({ stop, t }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-ink">
      {stop.isImportant ? <StarIcon size={14} className="shrink-0 text-accent" /> : null}
      {stop.name}
      {stop.isOptional ? <span className="font-light text-muted">{t('dayCard.optionalLabel')}</span> : null}
    </span>
  )
}

function SortableStopRow({ stop, prevStop, tripId, canEdit }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !canEdit,
  })
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [isConfirmingDuplicate, setIsConfirmingDuplicate] = useState(false)
  const [duplicateError, setDuplicateError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [areNotesExpanded, setAreNotesExpanded] = useState(false)
  const [runDeleteStop, { loading }] = useMutation(DELETE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const [runDuplicateStop, { loading: duplicating }] = useMutation(DUPLICATE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleConfirmDelete() {
    setDeleteError(null)
    try {
      await runDeleteStop({ variables: { id: stop.id } })
      setIsConfirmingDelete(false)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  async function handleConfirmDuplicate() {
    setDuplicateError(null)
    try {
      await runDuplicateStop({ variables: { id: stop.id } })
      setIsConfirmingDuplicate(false)
    } catch (err) {
      setDuplicateError(err.message)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-3"
    >
      {canEdit ? (
        <button
          type="button"
          aria-label={t('dayCard.reorderAria')}
          className="cursor-grab touch-none rounded-lg text-muted hover:bg-surface active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-accent"
          data-no-pull-refresh
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon size={18} />
        </button>
      ) : null}
      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <StopName stop={stop} t={t} />
          {stop.startTime ? (
            <span className="flex items-center gap-1 text-sm text-muted">
              <ClockIcon size={14} />
              {formatTime(stop.startTime)}
            </span>
          ) : null}
          {stop.notes ? (
            <>
              <button
                type="button"
                onClick={() => setAreNotesExpanded((prev) => !prev)}
                aria-expanded={areNotesExpanded}
                className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <NotesIcon size={14} />
                {areNotesExpanded ? t('dayCard.hideNotes') : t('dayCard.viewNotes')}
              </button>
              {areNotesExpanded ? (
                <p className="whitespace-pre-wrap text-sm text-muted">{stop.notes}</p>
              ) : null}
            </>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            {prevStop && (
              <a
                href={`${googleMapsUrl}&origin=${prevStop.location.lat},${prevStop.location.lng}&destination=${stop.location.lat},${stop.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('dayCard.howToGetToAria', { name: stop.name })}
                className="cursor-pointer rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <MapIcon size={16} />
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={t('dayCard.editAria', { name: stop.name })}
              className="cursor-pointer rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <PencilIcon size={16} />
            </button>
            <button
              type="button"
              disabled={duplicating}
              onClick={() => {
                setDuplicateError(null)
                setIsConfirmingDuplicate(true)
              }}
              aria-label={t('dayCard.duplicateAria', { name: stop.name })}
              className="cursor-pointer rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CopyIcon size={16} />
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDeleteError(null)
                setIsConfirmingDelete(true)
              }}
              aria-label={t('dayCard.removeAria', { name: stop.name })}
              className="cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ) : null}
      </div>

      {isConfirmingDuplicate ? (
        <ConfirmDialog
          title={t('dayCard.duplicateStopTitle')}
          message={t('dayCard.duplicateStopMessage', { name: stop.name })}
          confirmLabel={t('dayCard.duplicate')}
          loadingLabel={t('dayCard.duplicating')}
          icon={CopyIcon}
          tone="accent"
          onConfirm={handleConfirmDuplicate}
          onCancel={() => setIsConfirmingDuplicate(false)}
          loading={duplicating}
          error={duplicateError}
        />
      ) : null}

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={t('dayCard.removeStopTitle')}
          message={t('dayCard.removeStopMessage', { name: stop.name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          loading={loading}
          error={deleteError}
        />
      ) : null}

      {isEditing ? (
        <EditStopModal stop={stop} tripId={tripId} onClose={() => setIsEditing(false)} />
      ) : null}
    </li>
  )
}

export function StopDragPreview({ stop }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent bg-surface-2 px-2 py-3 shadow-lg">
      <span className="px-1 text-muted">⠿</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <StopName stop={stop} t={t} />
        {stop.startTime ? (
          <span className="flex items-center gap-1 text-sm text-muted">
            <ClockIcon size={14} />
            {formatTime(stop.startTime)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function DayCard({ day, stops, tripId, canEdit, isToday }) {
  const { t, locale } = useTranslation()
  const [isAddingStop, setIsAddingStop] = useState(false)
  const [isConfirmingDeleteDay, setIsConfirmingDeleteDay] = useState(false)
  const [deleteDayError, setDeleteDayError] = useState(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [runDeleteDay, { loading: deletingDay }] = useMutation(DELETE_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const { setNodeRef } = useDroppable({ id: `day:${day.id}` })

  async function handleConfirmDeleteDay() {
    setDeleteDayError(null)
    try {
      await runDeleteDay({ variables: { id: day.id } })
      setIsConfirmingDeleteDay(false)
    } catch (err) {
      setDeleteDayError(err.message)
    }
  }

  return (
    <div
      id={`day-${day.id}`}
      className={`flex flex-col gap-3 rounded-xl border bg-surface p-5 shadow-sm ${isToday ? 'border-accent' : 'border-border'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg text-ink">{formatFullDate(day.date, locale)}</h3>
          {isToday ? (
            <span className="flex w-fit items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              {t('dayCard.todayBadge')}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {stops.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <MapPinIcon size={16} />
              {t('dayCard.viewDayMap')}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              disabled={deletingDay}
              onClick={() => {
                setDeleteDayError(null)
                setIsConfirmingDeleteDay(true)
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <TrashIcon size={16} />
              {t('dayCard.deleteDay')}
            </button>
          ) : null}
        </div>
      </div>

      {isConfirmingDeleteDay ? (
        <ConfirmDialog
          title={t('dayCard.deleteDayTitle')}
          message={t('dayCard.deleteDayMessage', { date: formatFullDate(day.date, locale) })}
          onConfirm={handleConfirmDeleteDay}
          onCancel={() => setIsConfirmingDeleteDay(false)}
          loading={deletingDay}
          error={deleteDayError}
        />
      ) : null}

      {isMapOpen ? (
        <DayMapModal
          dayLabel={formatFullDate(day.date, locale)}
          stops={stops}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}

      <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-14 flex-col gap-2">
          {stops.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
              {canEdit ? t('dayCard.dragHere') : t('dayCard.noStopsYet')}
            </li>
          ) : (
            stops.map((stop, index) => (
              <SortableStopRow
                key={stop.id}
                stop={stop}
                prevStop={index > 0 ? stops[index - 1] : null}
                tripId={tripId}
                canEdit={canEdit}
              />
            ))
          )}
        </ul>
      </SortableContext>

      {canEdit ? (
        <button
          type="button"
          onClick={() => setIsAddingStop(true)}
          className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {t('stopForm.addStop')}
        </button>
      ) : null}

      {isAddingStop ? (
        <AddStopModal dayId={day.id} tripId={tripId} onClose={() => setIsAddingStop(false)} />
      ) : null}
    </div>
  )
}
