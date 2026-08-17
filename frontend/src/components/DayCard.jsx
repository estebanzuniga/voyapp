import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DELETE_DAY_MUTATION, DELETE_STOP_MUTATION, DUPLICATE_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { formatFullDate, formatTime } from '../lib/dates'
import { AddStopModal } from './AddStopModal'
import { ConfirmDialog } from './ConfirmDialog'
import { DayMapModal } from './DayMapModal'
import { EditStopModal } from './EditStopModal'
import { ClockIcon, CopyIcon, GripVerticalIcon, MapPinIcon, NotesIcon, PencilIcon, PlusIcon, TrashIcon } from './Icons'

function SortableStopRow({ stop, tripId, canEdit }) {
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
          aria-label="Reorder stop"
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
          <span className="font-semibold text-ink">{stop.name}</span>
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
                {areNotesExpanded ? 'Hide notes' : 'View notes'}
              </button>
              {areNotesExpanded ? (
                <p className="whitespace-pre-wrap text-sm text-muted">{stop.notes}</p>
              ) : null}
            </>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit ${stop.name}`}
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
              aria-label={`Duplicate ${stop.name}`}
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
              aria-label={`Remove ${stop.name}`}
              className="cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ) : null}
      </div>

      {isConfirmingDuplicate ? (
        <ConfirmDialog
          title="Duplicate stop"
          message={`Add a copy of "${stop.name}" right after it?`}
          confirmLabel="Duplicate"
          loadingLabel="Duplicating…"
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
          title="Remove stop"
          message={`Are you sure you want to remove "${stop.name}"? This can't be undone.`}
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
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent bg-surface-2 px-2 py-3 shadow-lg">
      <span className="px-1 text-muted">⠿</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-semibold text-ink">{stop.name}</span>
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

export function DayCard({ day, stops, tripId, canEdit }) {
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg text-ink">{formatFullDate(day.date)}</h3>
        <div className="flex items-center gap-4">
          {stops.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <MapPinIcon size={16} />
              View day map
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
              Delete day
            </button>
          ) : null}
        </div>
      </div>

      {isConfirmingDeleteDay ? (
        <ConfirmDialog
          title="Delete day"
          message={`Are you sure you want to delete ${formatFullDate(day.date)}? All of its stops will be removed too. This can't be undone.`}
          onConfirm={handleConfirmDeleteDay}
          onCancel={() => setIsConfirmingDeleteDay(false)}
          loading={deletingDay}
          error={deleteDayError}
        />
      ) : null}

      {isMapOpen ? (
        <DayMapModal dayLabel={formatFullDate(day.date)} stops={stops} onClose={() => setIsMapOpen(false)} />
      ) : null}

      <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-14 flex-col gap-2">
          {stops.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
              {canEdit ? 'Drag a stop here' : 'No stops yet'}
            </li>
          ) : (
            stops.map((stop) => (
              <SortableStopRow key={stop.id} stop={stop} tripId={tripId} canEdit={canEdit} />
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
          Add stop
        </button>
      ) : null}

      {isAddingStop ? (
        <AddStopModal dayId={day.id} tripId={tripId} onClose={() => setIsAddingStop(false)} />
      ) : null}
    </div>
  )
}
