import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { REQUEST_PASSWORD_RESET_MUTATION } from '../graphql/mutations'
import { AuthVisualPanel } from '../components/AuthVisualPanel'
import { CheckIcon } from '../components/Icons'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [runRequestReset, { loading, error }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION)

  async function handleSubmit(event) {
    event.preventDefault()
    await runRequestReset({ variables: { email } })
    setSubmitted(true)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuthVisualPanel tagline="Every itinerary starts with a spark of somewhere else." />

      <div className="flex flex-col justify-center bg-surface px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-display mb-8 text-xl text-ink">VoyApp</p>

          {submitted ? (
            <div className="flex flex-col gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-2/10 text-accent-2">
                <CheckIcon size={24} />
              </span>
              <h1 className="font-display text-3xl font-medium text-ink text-balance">Check your inbox</h1>
              <p className="max-w-[34ch] text-muted">
                If that email is registered, we've sent a link to reset your password. It's valid for 1
                hour.
              </p>
              <Link
                to="/login"
                className="mt-2 font-semibold text-accent hover:underline"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display mb-1 text-3xl font-medium text-ink text-balance">
                Reset your password
              </h1>
              <p className="mb-8 max-w-[34ch] text-muted">
                Enter your email and we'll send you a link to get back into your account.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-semibold text-ink">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-6 text-sm text-muted">
                Remembered it after all?{' '}
                <Link to="/login" className="font-semibold text-accent hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
