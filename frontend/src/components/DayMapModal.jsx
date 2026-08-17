import { Suspense, lazy, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { Modal } from './Modal'
import { MaximizeIcon, MinimizeIcon, XIcon } from './Icons'

const DayMap = lazy(() => import('./DayMap').then((module) => ({ default: module.DayMap })))

export function DayMapModal({ dayLabel, stops, onClose }) {
  const { t } = useTranslation()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const controls = (
    <>
      <button
        type="button"
        onClick={() => setIsFullscreen((prev) => !prev)}
        aria-label={isFullscreen ? t('dayMap.exitFullScreen') : t('dayMap.viewFullScreen')}
        className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} className={isFullscreen ? 'pt-0' : 'max-w-2xl'} fullBleed={isFullscreen}>
      {/* Non-fullscreen: buttons float over the top-right corner of the small dialog, same as before. */}
      {!isFullscreen && <div className="absolute right-1 top-1 flex items-center gap-1">{controls}</div>}

      <div
        className={`flex flex-col gap-3 ${
          isFullscreen
            ? // Rotating to landscape moves the notch/rounded-corner from the top
              // edge to whichever side it ends up on - same reasoning as the
              // pt-[...] on the row below, just for the two side edges instead.
              'h-full pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))]'
            : ''
        }`}
      >
        {isFullscreen ? (
          // Fullscreen: title and buttons share one row so they move down together, by
          // exactly the safe-area inset (status bar/notch) and nothing more - avoids both
          // the earlier overlap bug and the "too much margin" it caused when the whole
          // dialog's padding was inflated instead of just this row.
          <div className="flex items-center justify-between gap-2 pt-[max(0.25rem,env(safe-area-inset-top))]">
            <h2 className="font-display text-lg text-ink">{dayLabel}</h2>
            <div className="flex items-center gap-1">{controls}</div>
          </div>
        ) : (
          <h2 className="font-display pr-20 text-lg text-ink">{dayLabel}</h2>
        )}

        <div
          className={
            isFullscreen
              ? 'w-full min-h-0 flex-1 overflow-hidden rounded-lg border border-border'
              : 'h-72 w-full overflow-hidden rounded-lg border border-border sm:h-96'
          }
        >
          <Suspense
            fallback={<div className="flex h-full items-center justify-center text-sm text-muted">{t('common.loadingMap')}</div>}
          >
            <DayMap stops={stops} />
          </Suspense>
        </div>
      </div>
    </Modal>
  )
}
