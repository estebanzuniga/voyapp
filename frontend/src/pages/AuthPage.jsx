import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const { login } = useAuth()
  const navigate = useNavigate()
  const copy = COPY[mode]
  const [runMutation, { loading, error }] = useMutation(
    mode === 'signup' ? SIGNUP_MUTATION : LOGIN_MUTATION,
  )

  async function handleSubmit(event) {
    event.preventDefault()
    const { data } = await runMutation({ variables: { email, password } })
    login(data[mode])
    navigate('/trips')
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
              <label htmlFor="password" className="text-sm font-semibold text-ink">
                Password
              </label>
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
              className="mt-1 rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:opacity-60"
            >
              {loading ? 'Please wait…' : copy.cta}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {copy.switchPrompt}{' '}
            <Link to={copy.switchTo} className="font-semibold text-accent hover:underline">
              {copy.switchLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
