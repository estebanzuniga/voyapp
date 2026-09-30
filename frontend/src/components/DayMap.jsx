import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocateMe } from '../hooks/useLocateMe'
import { useTranslation } from '../hooks/useTranslation'
import { formatTime } from '../lib/dates'
import { GOOGLE_MAPS_DIRECTIONS_URL, haversineDistanceMeters } from '../lib/geo'
import { ClockIcon, LocateIcon, NavigationIcon } from './Icons'

const SINGLE_STOP_ZOOM = 14
const ROUTE_COLOR = '#e0602f'

function createNumberedIcon(number) {
  return L.divIcon({
    className: '',
    html: `<div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-xs font-bold text-accent-ink shadow-md">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

// "Locate me" + live navigation, scoped entirely to this map (per product
// decision: the day list's own "how to get to" link stays independent, this
// is the only place with a persistent blue-dot + accuracy circle). Built on
// Leaflet's own map.locate(), which already wraps navigator.geolocation and
// fires locationfound/locationerror - no separate geolocation plumbing
// needed here beyond turning those events into UI state.
function LocateControl({ stops }) {
  const map = useMap()
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const { position, locating, error, handleLocate } = useLocateMe(map, t('dayMap.myLocation'))

  // These buttons sit directly inside the Leaflet container, so without this
  // a tap/scroll on them would also pan or zoom the map underneath.
  useEffect(() => {
    if (!containerRef.current) return
    L.DomEvent.disableClickPropagation(containerRef.current)
    L.DomEvent.disableScrollPropagation(containerRef.current)
  }, [])

  // No visited-tracking yet (that's a separate, not-yet-built phase), so
  // "next stop" is approximated as the nearest stop to the live position -
  // once visited state exists, this should prefer the first unvisited stop
  // in itinerary order instead.
  const nearestStop = useMemo(() => {
    if (!position || stops.length === 0) return null
    return stops.reduce((closest, stop) => {
      const distance = haversineDistanceMeters(position, stop.location)
      const closestDistance = haversineDistanceMeters(position, closest.location)
      return distance < closestDistance ? stop : closest
    })
  }, [position, stops])

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
      {position && nearestStop ? (
        <a
          href={`${GOOGLE_MAPS_DIRECTIONS_URL}&origin=${position.lat},${position.lng}&destination=${nearestStop.location.lat},${nearestStop.location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('dayMap.directionsToNext', { name: nearestStop.name })}
          className="cursor-pointer rounded-full border border-border bg-surface p-2 text-accent shadow-md hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <NavigationIcon size={18} />
        </a>
      ) : null}
      {error ? (
        <p className="max-w-40 rounded-lg border border-border bg-surface px-2 py-1 text-right text-xs text-muted shadow-md">
          {t(`dayMap.locateError.${error}`)}
        </p>
      ) : null}
    </div>
  )
}

export function DayMap({ stops }) {
  const positions = useMemo(() => stops.map((stop) => [stop.location.lat, stop.location.lng]), [stops])

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
      <LocateControl stops={stops} />

      {positions.length > 1 ? (
        <Polyline positions={positions} pathOptions={{ color: ROUTE_COLOR, weight: 3, dashArray: '6 8' }} />
      ) : null}

      {stops.map((stop, index) => (
        <Marker key={stop.id} position={[stop.location.lat, stop.location.lng]} icon={createNumberedIcon(index + 1)}>
          <Tooltip direction="top" offset={[0, -16]} permanent>
            {stop.name}
          </Tooltip>
          <Popup>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-ink">
                {index + 1}. {stop.name}
              </p>
              {stop.startTime ? (
                <p className="flex items-center gap-1 text-sm text-muted">
                  <ClockIcon size={14} />
                  {formatTime(stop.startTime)}
                </p>
              ) : null}
              {stop.notes ? <p className="text-sm text-muted">{stop.notes}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
