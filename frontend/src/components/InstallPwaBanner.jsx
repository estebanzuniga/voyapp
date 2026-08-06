import { usePwaInstall } from '../hooks/usePwaInstall'
import { DownloadIcon, ShareIosIcon, XIcon } from './Icons'

export function InstallPwaBanner() {
  const { installed, dismissed, canPromptInstall, showIosInstructions, promptInstall, dismiss } = usePwaInstall()

  if (installed || dismissed || (!canPromptInstall && !showIosInstructions)) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {showIosInstructions ? <ShareIosIcon size={20} /> : <DownloadIcon size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Install VoyApp</p>
          <p className="text-xs text-muted">
            {showIosInstructions
              ? 'Tap Share, then "Add to Home Screen".'
              : 'Add it to your home screen for quick, full-screen access.'}
          </p>
        </div>

        {canPromptInstall ? (
          <button
            type="button"
            onClick={promptInstall}
            className="shrink-0 cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Install
          </button>
        ) : null}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  )
}
