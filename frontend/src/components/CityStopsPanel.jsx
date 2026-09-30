import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DELETE_STOP_MUTATION,
  DUPLICATE_STOP_MUTATION,
  MOVE_STOP_MUTATION,
  REORDER_STOPS_MUTATION,
} from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { useTranslation } from '../hooks/useTranslation'
import { formatDate } from '../lib/dates'
import { AddStopModal } from './AddStopModal'
import { CityMapModal } from './CityMapModal'
import { ConfirmDialog } from './ConfirmDialog'
import { EditStopModal } from './EditStopModal'
import { StopName } from './DayCard'
import {
  BuildingIcon,
  CopyIcon,
  GripVerticalIcon,
  MapPinIcon,
  NotesIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'

// Any target index at or beyond the destination list's length just gets
// clamped there by moveStop - so "append to the end" doesn't need the
// caller to know that list's current length. Mirrors the same constant in
// DayCard.jsx (kept local here rather than shared - it's a one-line detail
// of moveStop's clamping, not a reusable concept).
const APPEND_TO_END_INDEX = 999999999

function CityRecommendationRow({ stop, tripId, days, stopCategories, canEdit }) {
  const { t, locale } = useTranslation()
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
  const [scheduleError, setScheduleError] = useState(null)
  const [runDeleteStop, { loading }] = useMutation(DELETE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const [runDuplicateStop, { loading: duplicating }] = useMutation(DUPLICATE_STOP_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })
  const [runScheduleForDay, { loading: scheduling }] = useMutation(MOVE_STOP_MUTATION, {
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

  async function handleScheduleForDay(event) {
    const dayId = event.target.value
    event.target.value = ''
    if (!dayId) return
    setScheduleError(null)
    try {
      await runScheduleForDay({
        variables: { stopId: stop.id, toDayId: dayId, toIndex: APPEND_TO_END_INDEX },
      })
    } catch (err) {
      setScheduleError(err.message)
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
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <StopName stop={stop} t={t} />
          {canEdit && days.length > 0 ? (
            <select
              defaultValue=""
              disabled={scheduling}
              onChange={handleScheduleForDay}
              aria-label={t('cityStops.scheduleAria', { name: stop.name })}
              className="w-36 rounded-lg border border-border bg-surface px-2 py-1 text-ink focus:outline-2 focus:outline-accent"
            >
              <option value="">{t('cityStops.scheduleForDay')}</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {formatDate(day.date, locale)}
                </option>
              ))}
            </select>
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

      {scheduleError ? <p className="text-sm text-red-600">{scheduleError}</p> : null}

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
        <EditStopModal
          stop={stop}
          tripId={tripId}
          categories={stopCategories}
          isCityStop
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </li>
  )
}

function CityStopsCard({ city, days, stopCategories, tripId, canEdit }) {
  const { t } = useTranslation()
  const [isAddingStop, setIsAddingStop] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [orderedStops, setOrderedStops] = useState(city.stops)
  const [dragError, setDragError] = useState(null)
  // A recommendation only makes sense to schedule onto a day already
  // grouped under this same city - scheduling it onto some other city's day
  // would silently detach it from the place it's actually a recommendation for.
  const cityDays = days.filter((day) => day.cityId === city.id)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [runReorderStops] = useMutation(REORDER_STOPS_MUTATION, {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  })

  // Refreshed trip data (a stop added/edited/moved elsewhere) lands as a new
  // `city.stops` array - keep the locally-reordered copy in sync with it.
  useEffect(() => {
    setOrderedStops(city.stops)
  }, [city.stops])

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedStops.findIndex((stop) => stop.id === active.id)
    const newIndex = orderedStops.findIndex((stop) => stop.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = orderedStops
    const reordered = arrayMove(orderedStops, oldIndex, newIndex)
    setOrderedStops(reordered)
    setDragError(null)

    try {
      await runReorderStops({
        variables: { cityId: city.id, stopIds: reordered.map((stop) => stop.id) },
      })
    } catch (err) {
      setOrderedStops(previous)
      setDragError(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display flex items-center gap-1.5 text-lg text-ink">
          <BuildingIcon size={18} className="text-accent" />
          {city.name}
        </h3>
        {orderedStops.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <MapPinIcon size={16} />
            {t('cityStops.viewCityMap')}
          </button>
        ) : null}
      </div>

      {isMapOpen ? (
        <CityMapModal
          cityName={city.name}
          stops={orderedStops}
          stopCategories={stopCategories}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}

      {dragError ? <p className="text-sm text-red-600">{dragError}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedStops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex min-h-14 flex-col gap-2">
            {orderedStops.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                {t('cityStops.noRecommendationsYet')}
              </li>
            ) : (
              orderedStops.map((stop) => (
                <CityRecommendationRow
                  key={stop.id}
                  stop={stop}
                  tripId={tripId}
                  days={cityDays}
                  stopCategories={stopCategories}
                  canEdit={canEdit}
                />
              ))
            )}
          </ul>
        </SortableContext>
      </DndContext>

      {canEdit ? (
        <button
          type="button"
          onClick={() => setIsAddingStop(true)}
          className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {t('cityStops.addRecommendation')}
        </button>
      ) : null}

      {isAddingStop ? (
        <AddStopModal
          cityId={city.id}
          cityName={city.name}
          cityStops={orderedStops}
          categories={stopCategories}
          tripId={tripId}
          onClose={() => setIsAddingStop(false)}
        />
      ) : null}
    </div>
  )
}

export function CityStopsPanel({ trip, tripId, canEdit }) {
  const { t } = useTranslation()

  if (trip.cities.length === 0) {
    return <p className="text-muted">{t('cityStops.noCitiesYet')}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {trip.cities.map((city) => (
        <CityStopsCard
          key={city.id}
          city={city}
          days={trip.days}
          stopCategories={trip.stopCategories}
          tripId={tripId}
          canEdit={canEdit}
        />
      ))}
    </div>
  )
}
