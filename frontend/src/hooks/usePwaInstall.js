import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'voyapp_pwa_install_dismissed_at'
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // don't re-nag for 14 days after a dismiss

function isStandalone() {
  // The "official" check (any browser that supports display-mode media
  // queries) plus `navigator.standalone`, Safari's older iOS-only flag for
  // the same thing - neither alone covers every browser.
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY))
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
}

// Wraps the two very different ways a browser lets you "install" a PWA:
//
// - Chromium browsers (Chrome/Edge/Samsung Internet, desktop or Android)
//   fire a `beforeinstallprompt` event once their own install-eligibility
//   heuristics are satisfied. We stash that event and can replay it later
//   via `.prompt()` - it can only be used once.
// - iOS Safari never fires that event at all; there is no programmatic
//   install API. "Installing" there is a manual Share -> Add to Home
//   Screen action, so the best we can do is detect iOS and show
//   instructions instead of a button.
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed)

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
      localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    // The prompt is single-use either way - accepted or dismissed, Chrome
    // won't let us call .prompt() on it again.
    setDeferredPrompt(null)
    if (outcome === 'accepted') setInstalled(true)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  return {
    installed,
    dismissed,
    canPromptInstall: Boolean(deferredPrompt),
    showIosInstructions: !deferredPrompt && !installed && isIos(),
    promptInstall,
    dismiss,
  }
}
