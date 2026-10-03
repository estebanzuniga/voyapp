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
import { formatDate, formatDateRange, enumerateDates, isToday } from '../lib/dates'
import { CityStopsPanel } from '../components/CityStopsPanel'
import { DayCard, StopDragPreview } from '../components/DayCard'
import { Skeleton } from '../components/Skeleton'
import { TripMapView } from '../components/TripMapView'
import { TripSettingsModal } from '../components/TripSettingsModal'
import {
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  EyeIcon,
  PlusIcon,
  SettingsIcon,
} from '../components/Icons'

function findContainerId(stopsByDay, stopId) {
  return Object.keys(stopsByDay).find((dayId) =>
    stopsByDay[dayId].some((stop) => stop.id === stopId),
  )
}

// The anchor id (first day) of whichever city-group contains `dayId`, or
// null if it's not inside one (day has no city assigned).
function findGroupAnchorId(groupedTimeline, dayId) {
  for (const item of groupedTimeline) {
    if (item.type === 'cityGroup' && item.days.some((day) => day.id === dayId)) {
      return item.days[0].id
    }
  }
  return null
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

function collapsedGroupsStorageKey(tripId) {
  return `voyapp_collapsed_city_groups:${tripId}`
}

function loadCollapsedGroupIds(tripId) {
  try {
    const raw = localStorage.getItem(collapsedGroupsStorageKey(tripId))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsedGroupIds(tripId, ids) {
  try {
    localStorage.setItem(collapsedGroupsStorageKey(tripId), JSON.stringify([...ids]))
  } catch {
    // Safari private mode / storage full / disabled - collapsing still
    // works for the rest of this session via React state, it just won't
    // be remembered next visit.
  }
}

// Each individual day's own collapse state, independent of (and nested
// inside) a city group's - a day can be collapsed whether it's a standalone
// entry in the timeline or one of several days inside an expanded city
// group. Same per-viewer-preference storage convention as the group state
// above, just a separate key/Set keyed by day id instead of group anchor id.
function collapsedDaysStorageKey(tripId) {
  return `voyapp_collapsed_days:${tripId}`
}

function loadCollapsedDayIds(tripId) {
  try {
    const raw = localStorage.getItem(collapsedDaysStorageKey(tripId))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsedDayIds(tripId, ids) {
  try {
    localStorage.setItem(collapsedDaysStorageKey(tripId), JSON.stringify([...ids]))
  } catch {
    // Safari private mode / storage full / disabled - collapsing still
    // works for the rest of this session via React state, it just won't
    // be remembered next visit.
  }
}

// A city-group's collapse state is keyed by its first day's id rather than
// its cityId, so two separate visits to the same city later in the trip
// (not adjacent - see the grouping pass below) collapse independently. If
// editing the trip changes which day starts a group (e.g. assigning an
// earlier day to the same city), the old key just goes stale in
// localStorage - harmless, the group reverts to expanded under its new key.
function CityGroupSection({
  cityName,
  days,
  tripId,
  cities,
  stopCategories,
  canEdit,
  stopsByDay,
  isExpanded,
  onToggle,
  collapsedDayIds,
  onToggleDay,
  locale,
}) {
  const { t } = useTranslation()
  // A single-day group shows just that one date - formatDateRange's
  // "date – date" would just repeat itself for the same day.
  const range =
    days.length === 1
      ? formatDate(days[0].date, locale)
      : formatDateRange(days[0].date, days[days.length - 1].date, locale)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <BuildingIcon size={14} />
        {t('tripDetail.cityGroupLabel', { city: cityName, range })}
        <ChevronDownIcon
          size={14}
          className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>
      {isExpanded ? (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              stops={stopsByDay[day.id] ?? day.stops}
              tripId={tripId}
              cities={cities}
              stopCategories={stopCategories}
              canEdit={canEdit}
              isToday={isToday(day.date)}
              isCollapsed={collapsedDayIds.has(day.id)}
              onToggleCollapse={() => onToggleDay(day.id)}
            />
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('itinerary')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(() => loadCollapsedGroupIds(id))
  const [collapsedDayIds, setCollapsedDayIds] = useState(() => loadCollapsedDayIds(id))
  // Set at drag start, read (and cleared) at drag end - not state, since
  // updating them shouldn't itself trigger a re-render.
  const dragOriginDayIdRef = useRef(null)
  const dragSnapshotRef = useRef(null)
  // Set by handleJumpToToday when today's day is inside a group that was
  // just expanded - the scrollIntoView has to wait for that expansion to
  // actually render (its DayCard doesn't exist in the DOM until then), so
  // this flags "scroll once the pending re-render lands" instead.
  const pendingScrollDayIdRef = useRef(null)

  const canEdit = trip?.myPermission === 'EDITOR'
  // Only set when today's date actually has a day in this trip's itinerary -
  // the "jump to today" button has nothing to scroll to otherwise.
  const todayDay = trip?.days.find((day) => isToday(day.date)) ?? null

  function toggleGroup(anchorId) {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(anchorId)) next.delete(anchorId)
      else next.add(anchorId)
      saveCollapsedGroupIds(id, next)
      return next
    })
  }

  function toggleDay(dayId) {
    setCollapsedDayIds((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) next.delete(dayId)
      else next.add(dayId)
      saveCollapsedDayIds(id, next)
      return next
    })
  }

  function handleJumpToToday() {
    if (!todayDay) return

    const anchorId = findGroupAnchorId(groupedTimeline, todayDay.id)
    const needsGroupExpand = Boolean(anchorId) && collapsedGroupIds.has(anchorId)
    const needsDayExpand = collapsedDayIds.has(todayDay.id)

    if (needsGroupExpand || needsDayExpand) {
      pendingScrollDayIdRef.current = todayDay.id
      if (needsGroupExpand) toggleGroup(anchorId)
      if (needsDayExpand) toggleDay(todayDay.id)
      return
    }

    document.getElementById(`day-${todayDay.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!pendingScrollDayIdRef.current) return
    const dayId = pendingScrollDayIdRef.current
    pendingScrollDayIdRef.current = null
    // One frame so the newly-expanded group/day's DayCard has actually painted.
    requestAnimationFrame(() => {
      document.getElementById(`day-${dayId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [collapsedGroupIds, collapsedDayIds])

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

  // Second pass: fold consecutive same-city 'day' entries into one
  // collapsible 'cityGroup' - a gap, or a change in city (including
  // dropping to no city), ends the run. This runs strictly after the pass
  // above (which already interleaves gaps in date order) rather than being
  // merged into it, since "is this the same city as the *previous timeline
  // entry*" only makes sense once gaps are already in place - a city
  // reappearing after a gap should start a new group, not silently rejoin
  // the old one.
  const groupedTimeline = []
  for (const item of timeline) {
    if (item.type === 'day' && item.day.cityId) {
      const last = groupedTimeline[groupedTimeline.length - 1]
      if (last?.type === 'cityGroup' && last.cityId === item.day.cityId) {
        last.days.push(item.day)
        continue
      }
      groupedTimeline.push({ type: 'cityGroup', cityId: item.day.cityId, days: [item.day] })
      continue
    }
    groupedTimeline.push(item)
  }

  return (
    <div
      className={`bg-bg pt-4 sm:pt-6 ${
        activeTab === 'map' && trip
          ? 'flex h-[calc(100dvh-max(1rem,env(safe-area-inset-top))-env(safe-area-inset-bottom))] flex-col overflow-hidden px-2 pb-4'
          : 'min-h-dvh px-4 pb-8 sm:px-8 lg:px-12'
      }`}
    >
      <div
        className={`mx-auto flex min-h-0 flex-1 flex-col gap-4 ${
          activeTab === 'map' && trip ? 'w-full' : 'max-w-4xl'
        }`}
      >
        <Link
          to="/trips"
          className="flex w-fit items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
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
            <header className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="font-display text-2xl text-ink text-balance">{trip.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      aria-label={t('tripDetail.settingsAria')}
                      className="cursor-pointer rounded-lg border border-border p-2 text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <SettingsIcon size={16} />
                    </button>
                  ) : null}
                  {todayDay ? (
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <CalendarIcon size={14} />
                      {t('tripDetail.jumpToToday')}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-muted">{formatDateRange(trip.startDate, trip.endDate, locale)}</p>
              {!trip.isOwner ? (
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                  <EyeIcon size={14} />
                  {t('tripDetail.sharedWith', {
                    permission: canEdit ? t('tripDetail.canEdit') : t('tripDetail.viewOnly'),
                  })}
                </span>
              ) : null}
            </header>

            {isSettingsOpen ? (
              <TripSettingsModal
                tripId={id}
                cities={trip.cities}
                stopCategories={trip.stopCategories}
                onClose={() => setIsSettingsOpen(false)}
              />
            ) : null}

            <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface-2 p-1">
              {[
                { id: 'itinerary', label: t('tripDetail.tabItinerary') },
                { id: 'cityStops', label: t('tripDetail.tabCityStops') },
                { id: 'map', label: t('tripDetail.tabMap') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    activeTab === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'cityStops' ? (
              <CityStopsPanel trip={trip} tripId={id} canEdit={canEdit} />
            ) : null}

            {activeTab === 'map' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <TripMapView trip={trip} />
              </div>
            ) : null}

            {dragError ? <p className="text-sm text-red-600">{dragError}</p> : null}
            {addDayError ? <p className="text-sm text-red-600">{addDayError}</p> : null}

            {activeTab === 'itinerary' && trip.days.length === 0 ? (
              <p className="text-muted">{t('tripDetail.noDaysYet')}</p>
            ) : null}

            {activeTab === 'itinerary' && groupedTimeline.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-col gap-4">
                  {groupedTimeline.map((item) => {
                    if (item.type === 'day') {
                      return (
                        <DayCard
                          key={item.day.id}
                          day={item.day}
                          stops={stopsByDay[item.day.id] ?? item.day.stops}
                          tripId={id}
                          cities={trip.cities}
                          stopCategories={trip.stopCategories}
                          canEdit={canEdit}
                          isToday={isToday(item.day.date)}
                          isCollapsed={collapsedDayIds.has(item.day.id)}
                          onToggleCollapse={() => toggleDay(item.day.id)}
                        />
                      )
                    }

                    if (item.type === 'cityGroup') {
                      const anchorId = item.days[0].id
                      const cityName =
                        trip.cities.find((city) => city.id === item.cityId)?.name ?? ''
                      return (
                        <CityGroupSection
                          key={`city:${anchorId}`}
                          cityName={cityName}
                          days={item.days}
                          tripId={id}
                          cities={trip.cities}
                          stopCategories={trip.stopCategories}
                          canEdit={canEdit}
                          stopsByDay={stopsByDay}
                          locale={locale}
                          isExpanded={!collapsedGroupIds.has(anchorId)}
                          onToggle={() => toggleGroup(anchorId)}
                          collapsedDayIds={collapsedDayIds}
                          onToggleDay={toggleDay}
                        />
                      )
                    }

                    return canEdit ? (
                      <AddDayGap
                        key={`gap:${item.dates.join(',')}`}
                        dates={item.dates}
                        addingDate={addingDate}
                        onAddDay={handleAddDay}
                        locale={locale}
                      />
                    ) : null
                  })}
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
