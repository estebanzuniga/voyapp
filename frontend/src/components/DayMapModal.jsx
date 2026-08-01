import { Suspense, lazy, useState } from 'react'
import { Modal } from './Modal'
import { MaximizeIcon, MinimizeIcon, XIcon } from './Icons'

const DayMap = lazy(() => import('./DayMap').then((module) => ({ default: module.DayMap })))

export function DayMapModal({ dayLabel, stops, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <Modal onClose={onClose} className={isFullscreen ? '' : 'max-w-2xl'} fullBleed={isFullscreen}>
      <div className="absolute right-1 top-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'}
          className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className={`flex flex-col gap-3 ${isFullscreen ? 'h-full' : ''}`}>
        <h2 className="font-display pr-20 text-lg text-ink">{dayLabel}</h2>

        <div
          className={
            isFullscreen
              ? 'w-full min-h-0 flex-1 overflow-hidden rounded-lg border border-border'
              : 'h-72 w-full overflow-hidden rounded-lg border border-border sm:h-96'
          }
        >
          <Suspense
            fallback={<div className="flex h-full items-center justify-center text-sm text-muted">Loading map…</div>}
          >
            <DayMap stops={stops} />
          </Suspense>
        </div>
      </div>
    </Modal>
  )
}
