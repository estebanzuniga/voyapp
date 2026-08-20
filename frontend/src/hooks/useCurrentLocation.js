import { useEffect, useState } from 'react'

// Silent, best-effort current position - never prompts for permission on its
// own. It only calls getCurrentPosition once the browser reports geolocation
// permission as already 'granted' (e.g. because the user tapped DayMap's
// "locate me" control earlier), so mounting a component that uses this hook
// never pops an unprompted permission dialog. Callers that get `null` back
// should fall back to whatever they'd have shown without geolocation - see
// DayCard.jsx's "how to get to" link, which falls back to the previous
// stop's location as the directions origin.
export function useCurrentLocation() {
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    let cancelled = false

    function requestPosition() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          }
        },
        () => {
          // Permission was granted but the read itself failed (e.g. GPS
          // timeout) - stay silent, callers already have a non-geolocation
          // fallback for this.
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      )
    }

    // Not all browsers support the Permissions API for 'geolocation' (older
    // Safari notably doesn't) - when it's unsupported, `.query` rejects and
    // we just never request a position, which is the safe default.
    if (!navigator.permissions?.query) return

    let permissionStatus
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled) return
        permissionStatus = status
        if (status.state === 'granted') requestPosition()
        // Picks up permission granted later in the same session (e.g. via
        // DayMap's "locate me" control) without needing a page reload.
        status.onchange = () => {
          if (status.state === 'granted') requestPosition()
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (permissionStatus) permissionStatus.onchange = null
    }
  }, [])

  return position
}
