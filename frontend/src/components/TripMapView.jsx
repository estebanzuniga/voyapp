import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { enumerateDates, formatFullDate, isToday, isTripInProgress, todayIsoDate } from '../lib/dates'
import { BuildingIcon, MaximizeIcon, MinimizeIcon } from './Icons'

const DayMap = lazy(() => import('./DayMap').then((module) => ({ default: module.DayMap })))

const MAX_DOTS = 20

function DaySlide({ date, day, cityName, locale }) {
  const { t } = useTranslation()
  const stopCount = day?.stops.length ?? 0

  return (
    <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="font-display text-sm text-ink">{formatFullDate(date, locale)}</span>
        {isToday(date) ? (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            {t('dayCard.todayBadge')}
          </span>
        ) : null}
      </div>
      {cityName ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
          <BuildingIcon size={12} />
          {cityName}
        </span>
      ) : null}
      <span className="text-xs text-muted">
        {stopCount > 0 ? t('tripMap.stopsPlanned', { count: stopCount }) : t('tripMap.noStopsPlanned')}
      </span>
    </div>
  )
}

export function TripMapView({ trip }) {
  const { t, locale } = useTranslation()
  const dates = useMemo(
    () => enumerateDates(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate],
  )
  const dayByDate = useMemo(() => new Map(trip.days.map((day) => [day.date, day])), [trip.days])
  const [selectedDate, setSelectedDate] = useState(() =>
    isTripInProgress(trip.startDate, trip.endDate) ? todayIsoDate() : trip.startDate,
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const trackRef = useRef(null)
  const hasMountedRef = useRef(false)
  const isSyncingScrollRef = useRef(false)
  const syncSettleTimeoutRef = useRef(null)
  const selectedIndex = Math.max(dates.indexOf(selectedDate), 0)

  useEffect(() => {
    const track = trackRef.current
    const slide = track?.children[selectedIndex]
    if (!slide) return
    isSyncingScrollRef.current = true
    clearTimeout(syncSettleTimeoutRef.current)
    syncSettleTimeoutRef.current = setTimeout(() => {
      isSyncingScrollRef.current = false
    }, 600)
    slide.scrollIntoView({ behavior: hasMountedRef.current ? 'smooth' : 'auto', inline: 'center', block: 'nearest' })
    hasMountedRef.current = true
  }, [selectedIndex])

  function handleScroll() {
    if (isSyncingScrollRef.current) {
      clearTimeout(syncSettleTimeoutRef.current)
      syncSettleTimeoutRef.current = setTimeout(() => {
        isSyncingScrollRef.current = false
      }, 150)
      return
    }

    const track = trackRef.current
    if (!track || dates.length === 0) return
    const itemWidth = track.scrollWidth / dates.length
    if (itemWidth === 0) return
    const index = Math.round(track.scrollLeft / itemWidth)
    const clamped = Math.min(Math.max(index, 0), dates.length - 1)
    const date = dates[clamped]
    if (date && date !== selectedDate) setSelectedDate(date)
  }

  const selectedDay = dayByDate.get(selectedDate) ?? null
  const stops = selectedDay?.stops ?? []

  const dotIndices = useMemo(() => {
    if (dates.length <= MAX_DOTS) return dates.map((_, index) => index)
    const indices = []
    for (let i = 0; i < MAX_DOTS; i += 1) {
      indices.push(Math.round((i * (dates.length - 1)) / (MAX_DOTS - 1)))
    }
    return [...new Set(indices)]
  }, [dates])

  const activeDotIndex = useMemo(
    () =>
      dotIndices.reduce((closest, index) =>
        Math.abs(index - selectedIndex) < Math.abs(closest - selectedIndex) ? index : closest,
      ),
    [dotIndices, selectedIndex],
  )

  // Swiping to a day with no stops while fullscreen (no map to show, so the
  // toggle button itself is hidden) would otherwise leave no way back out -
  // drop out of fullscreen automatically instead.
  useEffect(() => {
    if (stops.length === 0) setIsFullscreen(false)
  }, [stops.length])

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-2000 flex flex-col gap-3 bg-bg p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]'
          : 'flex h-full min-h-0 min-w-0 flex-col gap-3'
      }
    >
      <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden rounded-lg border border-border">
        {stops.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? t('dayMap.exitFullScreen') : t('dayMap.viewFullScreen')}
            className="absolute right-14 top-2 z-1000 cursor-pointer rounded-full border border-border bg-surface p-2 text-ink shadow-md hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
          </button>
        ) : null}
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-muted">{t('common.loadingMap')}</div>
          }
        >
          {stops.length > 0 ? (
            <DayMap stops={stops} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t('tripMap.noStopsPlanned')}
            </div>
          )}
        </Suspense>
      </div>

      <ul
        ref={trackRef}
        onScroll={handleScroll}
        data-no-pull-refresh
        className="flex min-w-0 snap-x snap-mandatory overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {dates.map((date) => (
          <li key={date} className="w-[85%] shrink-0 snap-center px-1 sm:w-[60%]">
            <DaySlide
              date={date}
              day={dayByDate.get(date)}
              cityName={trip.cities.find((city) => city.id === dayByDate.get(date)?.cityId)?.name ?? null}
              locale={locale}
            />
          </li>
        ))}
      </ul>

      {dates.length > 1 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5">
          {dotIndices.map((index) => {
            const isActive = index === activeDotIndex
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedDate(dates[index])}
                aria-label={formatFullDate(dates[index], locale)}
                aria-current={isActive}
                className={`h-2 cursor-pointer rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive ? 'w-5 bg-accent' : 'w-2 bg-border hover:bg-muted'
                }`}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
