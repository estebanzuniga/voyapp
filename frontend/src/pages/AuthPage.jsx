import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { LOGIN_MUTATION, SIGNUP_MUTATION } from '../graphql/mutations'
import { AuthVisualPanel } from '../components/AuthVisualPanel'

const COPY = {
  login: {
    heading: 'Welcome back',
    subtext: 'Log in to keep planning your next trip.',
    cta: 'Log in',
    switchPrompt: 'New to Voyapp?',
    switchLabel: 'Create an account',
    switchTo: '/signup',
  },
  signup: {
    heading: 'Start your story',
    subtext: 'Create an account to begin your next itinerary.',
    cta: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Log in instead',
    switchTo: '/login',
  },
}

export function AuthPage({ mode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const copy = COPY[mode]
  const [runMutation, { loading, error }] = useMutation(
    mode === 'signup' ? SIGNUP_MUTATION : LOGIN_MUTATION,
  )

  // Coming from an invite link (e.g. /login?redirect=/invite/TOKEN) sends
  // the user back to accept it instead of the dashboard.
  const redirectTo = searchParams.get('redirect') || '/trips'

  async function handleSubmit(event) {
    event.preventDefault()
    const variables =
      mode === 'signup' ? { email, password, firstName, lastName } : { email, password }
    const { data } = await runMutation({ variables })
    await login(data[mode])
    navigate(redirectTo)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AuthVisualPanel tagline="Every itinerary starts with a spark of somewhere else." />

      <div className="flex flex-col justify-center bg-surface px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-display mb-8 text-xl text-ink">VoyApp</p>
          <h1 className="font-display mb-1 text-3xl font-medium text-ink text-balance">
            {copy.heading}
          </h1>
          <p className="mb-8 max-w-[34ch] text-muted">{copy.subtext}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' ? (
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="firstName" className="text-sm font-semibold text-ink">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Ada"
                    autoComplete="given-name"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="lastName" className="text-sm font-semibold text-ink">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Lovelace"
                    autoComplete="family-name"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>
              </div>
            ) : null}

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

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-ink">
                  Password
                </label>
                {mode === 'login' ? (
                  <Link to="/forgot-password" className="text-sm font-semibold text-accent hover:underline">
                    Forgot password?
                  </Link>
                ) : null}
              </div>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {loading ? 'Please wait…' : copy.cta}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {copy.switchPrompt}{' '}
            <Link
              to={searchParams.get('redirect') ? `${copy.switchTo}?redirect=${searchParams.get('redirect')}` : copy.switchTo}
              className="font-semibold text-accent hover:underline"
            >
              {copy.switchLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
