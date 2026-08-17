import { AddStopForm } from './AddStopForm'
import { Modal } from './Modal'
import { XIcon } from './Icons'

export function AddStopModal({ dayId, tripId, onClose }) {
  return (
    <Modal onClose={onClose} className="max-w-lg">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      <h2 className="font-display mb-4 pr-6 text-lg text-ink">Add stop</h2>

      <AddStopForm dayId={dayId} tripId={tripId} onDone={onClose} />
    </Modal>
  )
}
