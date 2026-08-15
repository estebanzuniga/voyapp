import { Modal } from './Modal'
import { AlertTriangleIcon, XIcon } from './Icons'

// `tone` picks the icon color + confirm-button style: 'red' for destructive
// actions (the default - delete day/stop), 'accent' for safe, reversible
// ones (e.g. duplicate) that still warrant a confirmation but shouldn't look
// like a warning.
const TONE_STYLES = {
  red: {
    icon: 'text-red-600',
    button: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  },
  accent: {
    icon: 'text-accent',
    button: 'bg-accent text-accent-ink hover:bg-accent/90 focus-visible:outline-accent',
  },
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting…',
  icon: IconComponent = AlertTriangleIcon,
  tone = 'red',
  onConfirm,
  onCancel,
  loading,
  error,
}) {
  const toneStyles = TONE_STYLES[tone]

  return (
    <Modal onClose={onCancel} className="max-w-sm">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 pr-6">
          <span className={`mt-0.5 shrink-0 ${toneStyles.icon}`}>
            <IconComponent size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg text-ink">{title}</h2>
            <p className="text-sm text-muted">{message}</p>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${toneStyles.button}`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
