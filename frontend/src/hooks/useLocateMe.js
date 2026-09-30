import { useEffect, useState } from 'react'
import L from 'leaflet'

const LOCATE_COLOR = '#2563eb'

// Shared "locate me" state + the blue-dot/accuracy-circle layer, used by
// both DayMap's and CityMap's own LocateControl (each renders its own
// button/error UI, and DayMap additionally derives a "directions to
// nearest stop" link from `position` - that part stays out of this hook
// since it's DayMap-specific, per the product decision that live-location
// navigation only lives inside the Day Map).
export function useLocateMe(map, myLocationLabel) {
  const [locating, setLocating] = useState(false)
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null) // 'denied' | 'unavailable'

  useEffect(() => {
    function handleFound(event) {
      setLocating(false)
      setError(null)
      setPosition({ lat: event.latlng.lat, lng: event.latlng.lng, accuracy: event.accuracy })
    }
    function handleError(event) {
      setLocating(false)
      // Leaflet forwards the browser's GeolocationPositionError.code as-is:
      // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT - the
      // latter two both read as a generic "couldn't get your location".
      setError(event.code === 1 ? 'denied' : 'unavailable')
    }
    map.on('locationfound', handleFound)
    map.on('locationerror', handleError)
    return () => {
      map.off('locationfound', handleFound)
      map.off('locationerror', handleError)
    }
  }, [map])

  // Renders the blue dot + accuracy circle as a plain Leaflet layer (not
  // JSX), added/removed imperatively alongside map.locate()'s own events.
  useEffect(() => {
    if (!position) return undefined
    const layer = L.layerGroup([
      L.circle([position.lat, position.lng], {
        radius: position.accuracy,
        color: LOCATE_COLOR,
        weight: 1,
        fillColor: LOCATE_COLOR,
        fillOpacity: 0.1,
      }),
      L.circleMarker([position.lat, position.lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: LOCATE_COLOR,
        fillOpacity: 1,
      }).bindTooltip(myLocationLabel),
    ])
    layer.addTo(map)
    return () => map.removeLayer(layer)
  }, [position, map, myLocationLabel])

  function handleLocate() {
    setLocating(true)
    setError(null)
    // Permission is only ever requested here, lazily, on this explicit tap -
    // never proactively when the map opens.
    map.locate({ setView: true, enableHighAccuracy: true, watch: false })
  }

  return { position, locating, error, handleLocate }
}
