import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatTime } from '../lib/dates'
import { ClockIcon } from './Icons'

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

export function DayMap({ stops }) {
  const positions = useMemo(() => stops.map((stop) => [stop.location.lat, stop.location.lng]), [stops])

  if (positions.length === 0) return null

  return (
    <MapContainer center={positions[0]} zoom={SINGLE_STOP_ZOOM} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToStops positions={positions} />
      <InvalidateSizeOnResize />

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
