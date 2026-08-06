import { useEffect, useRef, useState } from 'react'
import { RefreshCwIcon } from './Icons'

// Pull-to-refresh gesture: drag down from the very top of the page to
// reload the app. Browsers already do this natively in a normal mobile tab,
// but a PWA opened in standalone mode (installed to the home screen) loses
// that gesture entirely, so we reimplement it by hand with touch events.
const PULL_THRESHOLD = 70 // px of (damped) pull needed to trigger a reload
const MAX_PULL = 110 // px cap so the indicator can't be dragged off-screen
const RESISTANCE = 0.5 // damping factor so the pull feels "heavier" than a raw finger drag

export function PullToRefresh({ children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isPulling = useRef(false)
  const touchStartY = useRef(0)
  const pullDistanceRef = useRef(0)

  useEffect(() => {
    function handleTouchStart(event) {
      if (isRefreshing) return
      // Only start tracking if we're already at the top of the page - otherwise
      // this is just a normal scroll gesture.
      if (window.scrollY > 0) return
      // Don't hijack the drag-and-drop reorder handles, or gestures happening
      // inside an open modal (e.g. panning the day map).
      if (event.target.closest('[data-no-pull-refresh]') || document.querySelector('[role="dialog"]')) {
        return
      }
      touchStartY.current = event.touches[0].clientY
      isPulling.current = true
    }

    function handleTouchMove(event) {
      if (!isPulling.current || isRefreshing) return
      const delta = event.touches[0].clientY - touchStartY.current
      if (delta <= 0 || window.scrollY > 0) {
        isPulling.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }
      // We're actively pulling down past the top - take over the gesture
      // instead of letting the browser try to scroll/bounce.
      event.preventDefault()
      const value = Math.min(delta * RESISTANCE, MAX_PULL)
      pullDistanceRef.current = value
      setPullDistance(value)
    }

    function handleTouchEnd() {
      if (!isPulling.current) return
      isPulling.current = false
      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        setIsRefreshing(true)
        setPullDistance(PULL_THRESHOLD)
        window.location.reload()
      } else {
        setPullDistance(0)
      }
      pullDistanceRef.current = 0
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isRefreshing])

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-3000 flex justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height: pullDistance, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-accent shadow-md"
          style={{ opacity: progress }}
        >
          <RefreshCwIcon
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
            style={isRefreshing ? undefined : { transform: `rotate(${progress * 180}deg)` }}
          />
        </div>
      </div>
      {children}
    </>
  )
}
