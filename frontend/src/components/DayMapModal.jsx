import { Suspense, lazy } from 'react'
import { Modal } from './Modal'
import { XIcon } from './Icons'

const DayMap = lazy(() => import('./DayMap').then((module) => ({ default: module.DayMap })))

export function DayMapModal({ dayLabel, stops, onClose }) {
  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 cursor-pointer text-muted hover:text-ink"
      >
        <XIcon size={18} />
      </button>

      <div className="flex flex-col gap-3">
        <h2 className="font-display pr-6 text-lg text-ink">{dayLabel}</h2>

        <div className="h-72 w-full overflow-hidden rounded-lg border border-border sm:h-96">
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
