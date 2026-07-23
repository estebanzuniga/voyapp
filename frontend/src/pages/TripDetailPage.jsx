import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { TRIP_QUERY } from '../graphql/queries'
import { ADD_DAY_MUTATION, MOVE_STOP_MUTATION, REORDER_STOPS_MUTATION } from '../graphql/mutations'
import { formatDate, formatDateRange, enumerateDates } from '../lib/dates'
import { DayCard, StopDragPreview } from '../components/DayCard'

function findContainerId(stopsByDay, stopId) {
  return Object.keys(stopsByDay).find((dayId) =>
    stopsByDay[dayId].some((stop) => stop.id === stopId),
  )
}

export function TripDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = useQuery(TRIP_QUERY, { variables: { id } })
  const trip = data?.trip

  const [stopsByDay, setStopsByDay] = useState({})
  const [addingDate, setAddingDate] = useState(null)
  const [dragError, setDragError] = useState(null)
  const [activeStop, setActiveStop] = useState(null)

  useEffect(() => {
    if (trip) {
      setStopsByDay(Object.fromEntries(trip.days.map((day) => [day.id, day.stops])))
    }
  }, [trip])

  const [runAddDay] = useMutation(ADD_DAY_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })
  const [runReorderStops] = useMutation(REORDER_STOPS_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })
  const [runMoveStop] = useMutation(MOVE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id } }],
    awaitRefetchQueries: true,
  })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function handleAddDay(date) {
    setAddingDate(date)
    await runAddDay({ variables: { tripId: id, date } })
    setAddingDate(null)
  }

  function handleDragStart(event) {
    const stopId = event.active.id
    const dayId = findContainerId(stopsByDay, stopId)
    if (!dayId) return
    setActiveStop(stopsByDay[dayId].find((stop) => stop.id === stopId))
  }

  async function handleDragEnd(event) {
    try {
      await moveOrReorder(event)
    } finally {
      setActiveStop(null)
    }
  }

  async function moveOrReorder(event) {
    const { active, over } = event
    if (!over) return

    const activeStopId = active.id
    const sourceDayId = findContainerId(stopsByDay, activeStopId)
    if (!sourceDayId) return

    const overIsDayContainer = typeof over.id === 'string' && over.id.startsWith('day:')
    const targetDayId = overIsDayContainer ? over.id.slice(4) : findContainerId(stopsByDay, over.id)
    if (!targetDayId) return

    const sourceList = stopsByDay[sourceDayId]
    const activeIndex = sourceList.findIndex((stop) => stop.id === activeStopId)
    const movingStop = sourceList[activeIndex]
    const previousStopsByDay = stopsByDay

    if (sourceDayId === targetDayId) {
      const overIndex = overIsDayContainer
        ? sourceList.length - 1
        : sourceList.findIndex((stop) => stop.id === over.id)
      if (activeIndex === overIndex) return

      const reordered = arrayMove(sourceList, activeIndex, overIndex)
      setStopsByDay((prev) => ({ ...prev, [sourceDayId]: reordered }))
      setDragError(null)
      try {
        await runReorderStops({
          variables: { dayId: sourceDayId, stopIds: reordered.map((stop) => stop.id) },
        })
      } catch (err) {
        setStopsByDay(previousStopsByDay)
        setDragError(err.message)
      }
      return
    }

    const targetList = stopsByDay[targetDayId]
    const insertAt = overIsDayContainer
      ? targetList.length
      : targetList.findIndex((stop) => stop.id === over.id)

    const newSource = sourceList.filter((stop) => stop.id !== activeStopId)
    const newTarget = [...targetList]
    newTarget.splice(insertAt, 0, movingStop)

    setStopsByDay((prev) => ({ ...prev, [sourceDayId]: newSource, [targetDayId]: newTarget }))
    setDragError(null)
    try {
      await runMoveStop({
        variables: { stopId: activeStopId, toDayId: targetDayId, toIndex: insertAt },
      })
    } catch (err) {
      setStopsByDay(previousStopsByDay)
      setDragError(err.message)
    }
  }

  const existingDates = new Set(trip?.days.map((day) => day.date) ?? [])
  const missingDates = trip
    ? enumerateDates(trip.startDate, trip.endDate).filter((date) => !existingDates.has(date))
    : []

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link to="/trips" className="text-sm font-semibold text-muted hover:text-ink">
          ← Back to trips
        </Link>

        {loading ? <p className="text-muted">Loading trip…</p> : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
        {!loading && !error && !trip ? <p className="text-muted">Trip not found.</p> : null}

        {trip ? (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="font-display text-2xl text-ink text-balance">{trip.title}</h1>
              <p className="text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
            </header>

            {dragError ? <p className="text-sm text-red-600">{dragError}</p> : null}

            {trip.days.length === 0 ? (
              <p className="text-muted">No days added yet.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-col gap-4">
                  {trip.days.map((day) => (
                    <DayCard
                      key={day.id}
                      day={day}
                      stops={stopsByDay[day.id] ?? day.stops}
                      tripId={id}
                    />
                  ))}
                </div>
                <DragOverlay>{activeStop ? <StopDragPreview stop={activeStop} /> : null}</DragOverlay>
              </DndContext>
            )}

            {missingDates.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-muted">Start a day</h2>
                <div className="flex flex-wrap gap-2">
                  {missingDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      disabled={addingDate === date}
                      onClick={() => handleAddDay(date)}
                      className="cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
                    >
                      {addingDate === date ? 'Adding…' : formatDate(date)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
