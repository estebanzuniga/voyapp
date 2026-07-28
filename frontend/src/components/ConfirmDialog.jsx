import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangleIcon, XIcon } from './Icons'

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return createPortal(
    <div
      role="presentation"
      onClick={onCancel}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-5 shadow-lg"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-3 top-3 cursor-pointer text-muted hover:text-ink"
        >
          <XIcon size={18} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <span className="mt-0.5 shrink-0 text-red-600">
            <AlertTriangleIcon size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="confirm-dialog-title" className="font-display text-lg text-ink">
              {title}
            </h2>
            <p className="text-sm text-muted">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
