import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { RESET_PASSWORD_MUTATION } from '../graphql/mutations'
import { AuthVisualPanel } from '../components/AuthVisualPanel'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState(null)
  const [runResetPassword, { loading, error: mutationError }] = useMutation(RESET_PASSWORD_MUTATION)

  const error = formError ?? mutationError?.message

  async function handleSubmit(event) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation don't match")
      return
    }
    setFormError(null)
    await runResetPassword({ variables: { token, newPassword } })
    navigate('/login', { replace: true })
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuthVisualPanel tagline="Every itinerary starts with a spark of somewhere else." />

      <div className="flex flex-col justify-center bg-surface px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-display mb-8 text-xl text-ink">VoyApp</p>

          {!token ? (
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-3xl font-medium text-ink text-balance">Invalid link</h1>
              <p className="max-w-[34ch] text-muted">
                This reset link is missing its token. Request a new one to continue.
              </p>
              <Link to="/forgot-password" className="mt-2 font-semibold text-accent hover:underline">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display mb-1 text-3xl font-medium text-ink text-balance">
                Choose a new password
              </h1>
              <p className="mb-8 max-w-[34ch] text-muted">
                Enter and confirm your new password below.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="newPassword" className="text-sm font-semibold text-ink">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-ink">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {loading ? 'Saving…' : 'Save new password'}
                </button>
              </form>

              <p className="mt-6 text-sm text-muted">
                <Link to="/login" className="font-semibold text-accent hover:underline">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
