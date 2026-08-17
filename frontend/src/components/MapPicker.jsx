import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from '../hooks/useTranslation'
import { MapPinIcon, SearchIcon } from './Icons'

const markerPinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2
const SELECTED_ZOOM = 14

function ClickToPlaceMarker({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function FlyToPosition({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), SELECTED_ZOOM))
    }
  }, [position, map])
  return null
}

export function MapPicker({ lat, lng, onSelect }) {
  const { t } = useTranslation()
  const position = lat != null && lng != null ? [lat, lng] : null
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      return undefined
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
        )
        const data = await response.json()
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleResultClick(result) {
    onSelect(Number(result.lat), Number(result.lon))
    setQuery(result.display_name)
    setResults([])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('mapPicker.searchPlaceholder')}
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
        {results.length > 0 ? (
          <ul className="absolute z-1000 mt-1 max-h-30 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
            {results.map((result) => (
              <li key={result.place_id}>
                <button
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className="w-full cursor-pointer px-3 py-2 text-left text-sm text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searching ? <p className="mt-1 text-xs text-muted">{t('mapPicker.searching')}</p> : null}
      </div>

      <div className="h-50 w-full overflow-hidden rounded-lg border border-border">
        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={position ? SELECTED_ZOOM : DEFAULT_ZOOM}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlaceMarker onSelect={onSelect} />
          <FlyToPosition position={position} />
          {position ? <Marker position={position} icon={markerPinIcon} /> : null}
        </MapContainer>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MapPinIcon size={14} />
        {position
          ? t('mapPicker.selected', { lat: position[0].toFixed(5), lng: position[1].toFixed(5) })
          : t('mapPicker.prompt')}
      </p>
    </div>
  )
}
