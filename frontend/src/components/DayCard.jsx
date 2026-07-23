import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DELETE_DAY_MUTATION,
  DELETE_STOP_MUTATION,
  REORDER_STOPS_MUTATION,
} from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { formatFullDate } from '../lib/dates'
import { AddStopForm } from './AddStopForm'

function SortableStopRow({ stop, tripId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })
  const [runDeleteStop, { loading }] = useMutation(DELETE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

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
              onClick={() => runDeleteStop({ variables: { id: stop.id } })}
              className="cursor-pointer text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
        {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
      </div>
    </li>
  )
}

export function DayCard({ day, tripId }) {
  const [isAddingStop, setIsAddingStop] = useState(false)
  const [stops, setStops] = useState(day.stops)
  const [reorderError, setReorderError] = useState(null)
  const [runDeleteDay, { loading: deletingDay }] = useMutation(DELETE_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const [runReorderStops] = useMutation(REORDER_STOPS_MUTATION)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    setStops(day.stops)
  }, [day.stops])

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = stops.findIndex((stop) => stop.id === active.id)
    const newIndex = stops.findIndex((stop) => stop.id === over.id)
    const previous = stops
    const reordered = arrayMove(stops, oldIndex, newIndex)
    setStops(reordered)
    setReorderError(null)

    try {
      await runReorderStops({
        variables: { dayId: day.id, stopIds: reordered.map((stop) => stop.id) },
      })
    } catch (err) {
      setStops(previous)
      setReorderError(err.message)
    }
  }

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

      {reorderError ? <p className="text-sm text-red-600">{reorderError}</p> : null}

      {stops.length === 0 ? (
        <p className="text-sm text-muted">No stops yet for this day.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {stops.map((stop) => (
                <SortableStopRow key={stop.id} stop={stop} tripId={tripId} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
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
