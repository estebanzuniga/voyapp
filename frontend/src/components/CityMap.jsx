import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocateMe } from '../hooks/useLocateMe'
import { useTranslation } from '../hooks/useTranslation'
import { LocateIcon } from './Icons'

const SINGLE_STOP_ZOOM = 14
const FALLBACK_EMOJI = '📍'

function createCategoryIcon(emoji) {
  return L.divIcon({
    className: '',
    html: `<div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-white text-base leading-none shadow-md">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function FitToStops({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], SINGLE_STOP_ZOOM)
    } else if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [32, 32] })
    }
  }, [positions, map])
  return null
}

function InvalidateSizeOnResize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function LocateControl() {
  const map = useMap()
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const { locating, error, handleLocate } = useLocateMe(map, t('dayMap.myLocation'))

  useEffect(() => {
    if (!containerRef.current) return
    L.DomEvent.disableClickPropagation(containerRef.current)
    L.DomEvent.disableScrollPropagation(containerRef.current)
  }, [])

  return (
    <div ref={containerRef} className="absolute right-2 top-2 z-1000 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        aria-label={t('dayMap.locateMeAria')}
        className="cursor-pointer rounded-full border border-border bg-surface p-2 text-ink shadow-md hover:bg-surface-2 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <LocateIcon size={18} />
      </button>
      {error ? (
        <p className="max-w-40 rounded-lg border border-border bg-surface px-2 py-1 text-right text-xs text-muted shadow-md">
          {t(`dayMap.locateError.${error}`)}
        </p>
      ) : null}
    </div>
  )
}

export function CityMap({ stops, stopCategories = [] }) {
  const positions = useMemo(() => stops.map((stop) => [stop.location.lat, stop.location.lng]), [stops])
  const categoryById = useMemo(
    () => new Map(stopCategories.map((category) => [category.id, category])),
    [stopCategories],
  )

  if (positions.length === 0) return null

  return (
    <MapContainer
      center={positions[0]}
      zoom={SINGLE_STOP_ZOOM}
      className="h-full w-full"
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToStops positions={positions} />
      <InvalidateSizeOnResize />
      <LocateControl />

      {stops.map((stop) => {
        const emoji = categoryById.get(stop.categoryId)?.emoji ?? FALLBACK_EMOJI
        return (
          <Marker
            key={stop.id}
            position={[stop.location.lat, stop.location.lng]}
            icon={createCategoryIcon(emoji)}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-ink">{stop.name}</p>
                {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
