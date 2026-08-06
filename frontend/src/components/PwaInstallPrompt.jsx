import '@khmyznikov/pwa-install'

// Thin wrapper around the `<pwa-install>` custom element. Registering it
// (the side-effect import above) pulls in the library's full bundle -
// screenshots, per-platform instructions, localization - so this component
// is lazy-loaded from App.jsx rather than imported eagerly in main.jsx,
// the same reasoning as lazy-loading Leaflet elsewhere in this app: it's
// not needed for first paint, so it shouldn't be part of the critical
// bundle every visitor downloads up front.
//
// Left in its default automatic mode (no `manual-apple`/`manual-chrome`
// attributes) - it shows its own dialog on its own once
// it detects the app is installable, handling the very different Chromium
// (native beforeinstallprompt) vs iOS/Safari (no install API at all, so it
// shows a "tap Share, then Add to Home Screen" walkthrough with screenshots)
// paths itself, rather than us reimplementing that per-platform detection.
//
// `use-local-storage` persists a user's "not now" choice so the dialog
// doesn't reappear on every visit once they've dismissed it.
export function PwaInstallPrompt() {
  return (
    <pwa-install
      manifest-url="/manifest.webmanifest"
      name="VoyApp"
      description="Build and organize your trip itineraries."
      icon="/pwa-512.png"
      use-local-storage
      styles='{"--tint-color": "#e0602f"}'
    ></pwa-install>
  )
}
