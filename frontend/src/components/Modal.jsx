import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ onClose, className = 'max-w-sm', fullBleed = false, children }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className={`fixed inset-0 z-2000 flex items-center justify-center overflow-y-auto bg-black/50 ${fullBleed ? '' : 'p-4'}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full bg-surface p-5 shadow-lg ${fullBleed ? 'h-full max-w-none rounded-none' : 'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl'} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
