import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { CHANGE_PASSWORD_MUTATION } from '../graphql/mutations'
import { Modal } from './Modal'
import { CheckIcon, XIcon } from './Icons'
import { PasswordInput } from './PasswordInput'

export function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [runChangePassword, { loading, error: mutationError }] = useMutation(
    CHANGE_PASSWORD_MUTATION,
  )

  async function handleSubmit(event) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation don't match")
      return
    }
    setFormError(null)
    await runChangePassword({ variables: { currentPassword, newPassword } })
    setSuccess(true)
  }

  const error = formError ?? mutationError?.message

  return (
    <Modal onClose={onClose} className="max-w-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      {success ? (
        // Swap the whole modal body for just the confirmation once the
        // password's changed - the form fields (now stale/blank) have
        // nothing left to do, so there's no reason to keep showing them.
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-2/10 text-accent-2">
            <CheckIcon size={24} />
          </span>
          <p className="font-semibold text-ink">Password updated.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-display pr-6 text-lg text-ink">Change password</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="currentPassword" className="text-sm font-semibold text-ink">
                Current password
              </label>
              <PasswordInput
                id="currentPassword"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-10 text-ink focus:outline-2 focus:outline-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="newPassword" className="text-sm font-semibold text-ink">
                New password
              </label>
              <PasswordInput
                id="newPassword"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-10 text-ink focus:outline-2 focus:outline-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-ink">
                Confirm new password
              </label>
              <PasswordInput
                id="confirmPassword"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-10 text-ink focus:outline-2 focus:outline-accent"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 cursor-pointer rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {loading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>
      )}
    </Modal>
  )
}
