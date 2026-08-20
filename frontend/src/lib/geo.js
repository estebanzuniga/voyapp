// Base URL for a Google Maps walking-directions link - shared by DayCard's
// per-stop "how to get to" link and DayMap's "directions to nearest stop"
// control so both build the exact same kind of URL.
export const GOOGLE_MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&travelmode=walking'

const EARTH_RADIUS_METERS = 6371000

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

// Straight-line ("as the crow flies") distance between two {lat, lng}
// points, via the haversine formula - not a routed walking distance, so it
// runs shorter than real streets/paths. Good enough for "which stop is
// closest" without pulling in a paid/rate-limited routing API.
export function haversineDistanceMeters(a, b) {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}
