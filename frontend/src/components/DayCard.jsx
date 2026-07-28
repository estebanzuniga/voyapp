import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DELETE_DAY_MUTATION, DELETE_STOP_MUTATION } from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { formatFullDate } from '../lib/dates'
import { AddStopForm } from './AddStopForm'
import { ConfirmDialog } from './ConfirmDialog'

function SortableStopRow({ stop, tripId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [runDeleteStop, { loading }] = useMutation(DELETE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  async function handleConfirmDelete() {
    await runDeleteStop({ variables: { id: stop.id } })
    setIsConfirmingDelete(false)
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
      <button
        type="button"
        aria-label="Reorder stop"
        className="cursor-grab touch-none px-1 text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-ink">{stop.name}</span>
          <div className="flex items-center gap-3">
            {stop.startTime ? <span className="text-sm text-muted">{stop.startTime}</span> : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => setIsConfirmingDelete(true)}
              aria-label={`Remove ${stop.name}`}
              className="cursor-pointer text-muted hover:text-red-600 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
        {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
      </div>

      {isConfirmingDelete ? (
        <ConfirmDialog
          title="Remove stop"
          message={`Are you sure you want to remove "${stop.name}"? This can't be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          loading={loading}
        />
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
        {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
      </div>
    </div>
  )
}

export function DayCard({ day, stops, tripId }) {
  const [isAddingStop, setIsAddingStop] = useState(false)
  const [isConfirmingDeleteDay, setIsConfirmingDeleteDay] = useState(false)
  const [runDeleteDay, { loading: deletingDay }] = useMutation(DELETE_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const { setNodeRef } = useDroppable({ id: `day:${day.id}` })

  async function handleConfirmDeleteDay() {
    await runDeleteDay({ variables: { id: day.id } })
    setIsConfirmingDeleteDay(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-ink">{formatFullDate(day.date)}</h3>
        <button
          type="button"
          disabled={deletingDay}
          onClick={() => setIsConfirmingDeleteDay(true)}
          className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60"
        >
          Delete day
        </button>
      </div>

      {isConfirmingDeleteDay ? (
        <ConfirmDialog
          title="Delete day"
          message={`Are you sure you want to delete ${formatFullDate(day.date)}? All of its stops will be removed too. This can't be undone.`}
          onConfirm={handleConfirmDeleteDay}
          onCancel={() => setIsConfirmingDeleteDay(false)}
          loading={deletingDay}
        />
      ) : null}

      <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-14 flex-col gap-2">
          {stops.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
              Drag a stop here
            </li>
          ) : (
            stops.map((stop) => <SortableStopRow key={stop.id} stop={stop} tripId={tripId} />)
          )}
        </ul>
      </SortableContext>

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
