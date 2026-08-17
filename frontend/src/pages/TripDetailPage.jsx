import { useEffect, useRef, useState } from 'react'
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
import { useTranslation } from '../hooks/useTranslation'
import { formatDate, formatDateRange, enumerateDates } from '../lib/dates'
import { DayCard, StopDragPreview } from '../components/DayCard'
import { Skeleton } from '../components/Skeleton'
import { ShareModal } from '../components/ShareModal'
import { ArrowLeftIcon, ChevronDownIcon, EyeIcon, PlusIcon, ShareIcon } from '../components/Icons'

function findContainerId(stopsByDay, stopId) {
  return Object.keys(stopsByDay).find((dayId) =>
    stopsByDay[dayId].some((stop) => stop.id === stopId),
  )
}

// A run of one missing date renders as a single "Add <date>" button - no
// point collapsing one thing. Two or more missing dates in a row collapse
// behind a "N days pending" toggle, so a big gap doesn't dump a wall of
// buttons between the days on either side of it.
function AddDayGap({ dates, addingDate, onAddDay, locale }) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  if (dates.length === 1) {
    const date = dates[0]
    return (
      <button
        type="button"
        disabled={addingDate === date}
        onClick={() => onAddDay(date)}
        className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-dashed border-border px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-accent disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <PlusIcon size={14} />
        {t('tripDetail.addDay', { date: formatDate(date, locale) })}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex cursor-pointer items-center gap-1 self-start rounded-lg text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {t('tripDetail.daysPending', { count: dates.length })}
        <ChevronDownIcon
          size={14}
          className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>
      {isExpanded ? (
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              disabled={addingDate === date}
              onClick={() => onAddDay(date)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <PlusIcon size={14} />
              {addingDate === date ? t('common.adding') : formatDate(date, locale)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TripDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = useQuery(TRIP_QUERY, { variables: { id } })
  const { t, locale } = useTranslation()
  const trip = data?.trip

  const [stopsByDay, setStopsByDay] = useState({})
  const [addingDate, setAddingDate] = useState(null)
  const [addDayError, setAddDayError] = useState(null)
  const [dragError, setDragError] = useState(null)
  const [activeStop, setActiveStop] = useState(null)
  const [isShareOpen, setIsShareOpen] = useState(false)
  // Set at drag start, read (and cleared) at drag end - not state, since
  // updating them shouldn't itself trigger a re-render.
  const dragOriginDayIdRef = useRef(null)
  const dragSnapshotRef = useRef(null)

  const canEdit = trip?.myPermission === 'EDITOR'

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
    setAddDayError(null)
    try {
      await runAddDay({ variables: { tripId: id, date } })
    } catch (err) {
      setAddDayError(err.message)
    } finally {
      setAddingDate(null)
    }
  }

  function handleDragStart(event) {
    const stopId = event.active.id
    const dayId = findContainerId(stopsByDay, stopId)
    if (!dayId) return
    setActiveStop(stopsByDay[dayId].find((stop) => stop.id === stopId))
    dragOriginDayIdRef.current = dayId
    dragSnapshotRef.current = stopsByDay
  }

  // Fires continuously while dragging. When the stop is hovered over a
  // *different* day than the one it currently lives in, move it into that
  // day's array right away - that's what makes @dnd-kit reserve a gap
  // (placeholder) for it there while still dragging, instead of the target
  // day only updating once the stop is dropped. Reordering within the same
  // day is still handled by @dnd-kit itself purely visually, so there's
  // nothing to do here when active and over share a day.
  function handleDragOver(event) {
    const { active, over } = event
    if (!over) return

    const activeStopId = active.id
    const activeDayId = findContainerId(stopsByDay, activeStopId)
    if (!activeDayId) return

    const overIsDayContainer = typeof over.id === 'string' && over.id.startsWith('day:')
    const overDayId = overIsDayContainer ? over.id.slice(4) : findContainerId(stopsByDay, over.id)
    if (!overDayId || activeDayId === overDayId) return

    setStopsByDay((prev) => {
      const activeList = prev[activeDayId]
      const overList = prev[overDayId]
      const activeIndex = activeList.findIndex((stop) => stop.id === activeStopId)
      if (activeIndex === -1) return prev
      const movingStop = activeList[activeIndex]

      const overIndex = overIsDayContainer
        ? overList.length
        : overList.findIndex((stop) => stop.id === over.id)

      const newActiveList = activeList.filter((stop) => stop.id !== activeStopId)
      const newOverList = [...overList]
      newOverList.splice(overIndex === -1 ? overList.length : overIndex, 0, movingStop)

      return { ...prev, [activeDayId]: newActiveList, [overDayId]: newOverList }
    })
  }

  async function handleDragEnd(event) {
    try {
      await finalizeDrag(event)
    } finally {
      setActiveStop(null)
      dragOriginDayIdRef.current = null
      dragSnapshotRef.current = null
    }
  }

  // By the time this runs, onDragOver has already relocated the stop into
  // whichever day it's being dropped on - so all that's left is figuring out
  // its final index within that day's (already-current) array from `over`,
  // then persisting: reorderStops if it never left its original day,
  // moveStop if onDragOver moved it into a different one.
  async function finalizeDrag(event) {
    const { active, over } = event
    const originDayId = dragOriginDayIdRef.current
    const previousStopsByDay = dragSnapshotRef.current
    if (!over || !originDayId || !previousStopsByDay) return

    const activeStopId = active.id
    const currentDayId = findContainerId(stopsByDay, activeStopId)
    if (!currentDayId) return

    const list = stopsByDay[currentDayId]
    const activeIndex = list.findIndex((stop) => stop.id === activeStopId)
    if (activeIndex === -1) return

    const overIsDayContainer = typeof over.id === 'string' && over.id.startsWith('day:')
    const overIndex = overIsDayContainer ? list.length - 1 : list.findIndex((stop) => stop.id === over.id)
    const finalIndex = overIndex === -1 ? list.length - 1 : overIndex

    if (currentDayId === originDayId && activeIndex === finalIndex) return

    const reordered = arrayMove(list, activeIndex, finalIndex)
    setStopsByDay((prev) => ({ ...prev, [currentDayId]: reordered }))
    setDragError(null)

    try {
      if (currentDayId === originDayId) {
        await runReorderStops({
          variables: { dayId: currentDayId, stopIds: reordered.map((stop) => stop.id) },
        })
      } else {
        await runMoveStop({
          variables: { stopId: activeStopId, toDayId: currentDayId, toIndex: finalIndex },
        })
      }
    } catch (err) {
      setStopsByDay(previousStopsByDay)
      setDragError(err.message)
    }
  }

  // Walk every date in the trip range and interleave existing days with runs
  // of missing dates, so "add day 2" renders between day 1 and day 3 instead
  // of every missing date being dumped into one section after all the days.
  const dayByDate = new Map((trip?.days ?? []).map((day) => [day.date, day]))
  const timeline = []
  if (trip) {
    let pendingGap = []
    for (const date of enumerateDates(trip.startDate, trip.endDate)) {
      const day = dayByDate.get(date)
      if (day) {
        if (pendingGap.length > 0) {
          timeline.push({ type: 'gap', dates: pendingGap })
          pendingGap = []
        }
        timeline.push({ type: 'day', day })
      } else {
        pendingGap.push(date)
      }
    }
    if (pendingGap.length > 0) {
      timeline.push({ type: 'gap', dates: pendingGap })
    }
  }

  return (
    <div className="min-h-dvh bg-bg px-4 pb-8 pt-4 sm:px-8 sm:pt-6 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Link
          to="/trips"
          className="flex items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeftIcon size={16} />
          {t('tripDetail.backToTrips')}
        </Link>

        {loading ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
                >
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
        {!loading && !error && !trip ? <p className="text-muted">{t('tripDetail.tripNotFound')}</p> : null}

        {trip ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl text-ink text-balance">{trip.title}</h1>
                <p className="text-muted">{formatDateRange(trip.startDate, trip.endDate, locale)}</p>
                {!trip.isOwner ? (
                  <span className="flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                    <EyeIcon size={14} />
                    {t('tripDetail.sharedWith', {
                      permission: canEdit ? t('tripDetail.canEdit') : t('tripDetail.viewOnly'),
                    })}
                  </span>
                ) : null}
              </div>
              {trip.isOwner ? (
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <ShareIcon size={16} />
                  {t('tripDetail.share')}
                </button>
              ) : null}
            </header>

            {isShareOpen ? <ShareModal tripId={id} onClose={() => setIsShareOpen(false)} /> : null}

            {dragError ? <p className="text-sm text-red-600">{dragError}</p> : null}
            {addDayError ? <p className="text-sm text-red-600">{addDayError}</p> : null}

            {trip.days.length === 0 ? <p className="text-muted">{t('tripDetail.noDaysYet')}</p> : null}

            {timeline.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-col gap-4">
                  {timeline.map((item) =>
                    item.type === 'day' ? (
                      <DayCard
                        key={item.day.id}
                        day={item.day}
                        stops={stopsByDay[item.day.id] ?? item.day.stops}
                        tripId={id}
                        canEdit={canEdit}
                      />
                    ) : canEdit ? (
                      // Keyed by the full date range, not just the first date: when
                      // adding a day splits this gap in two, each half needs a fresh
                      // key (and therefore a fresh, collapsed isExpanded state) rather
                      // than reusing the old gap's key/state for whichever half kept
                      // the same start date.
                      <AddDayGap
                        key={`gap:${item.dates.join(',')}`}
                        dates={item.dates}
                        addingDate={addingDate}
                        onAddDay={handleAddDay}
                        locale={locale}
                      />
                    ) : null,
                  )}
                </div>
                <DragOverlay>{activeStop ? <StopDragPreview stop={activeStop} /> : null}</DragOverlay>
              </DndContext>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
