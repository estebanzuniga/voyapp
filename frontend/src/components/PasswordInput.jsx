import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons'

// Wraps a plain <input> with a show/hide toggle - `className` styles the
// input itself (pass `pr-10` so typed text doesn't run under the icon
// button); everything else (id, value, onChange, required, ...) forwards
// straight through, same as using <input> directly.
export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={className} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  )
}
