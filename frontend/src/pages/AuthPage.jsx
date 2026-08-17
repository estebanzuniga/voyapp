import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import { LOGIN_MUTATION, SIGNUP_MUTATION } from '../graphql/mutations'
import { AuthVisualPanel } from '../components/AuthVisualPanel'
import { PasswordInput } from '../components/PasswordInput'

export function AuthPage({ mode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const { login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const copy =
    mode === 'signup'
      ? {
          heading: t('auth.signup.heading'),
          subtext: t('auth.signup.subtext'),
          cta: t('auth.signup.cta'),
          switchPrompt: t('auth.signup.switchPrompt'),
          switchLabel: t('auth.signup.switchLabel'),
          switchTo: '/login',
        }
      : {
          heading: t('auth.login.heading'),
          subtext: t('auth.login.subtext'),
          cta: t('auth.login.cta'),
          switchPrompt: t('auth.login.switchPrompt'),
          switchLabel: t('auth.login.switchLabel'),
          switchTo: '/signup',
        }
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
      <AuthVisualPanel tagline={t('common.tagline')} />

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
                    {t('auth.firstName.label')}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder={t('auth.firstName.placeholder')}
                    autoComplete="given-name"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="lastName" className="text-sm font-semibold text-ink">
                    {t('auth.lastName.label')}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder={t('auth.lastName.placeholder')}
                    autoComplete="family-name"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-semibold text-ink">
                {t('auth.email.label')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.email.placeholder')}
                autoComplete="email"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-ink">
                  {t('auth.password.label')}
                </label>
                {mode === 'login' ? (
                  <Link to="/forgot-password" className="text-sm font-semibold text-accent hover:underline">
                    {t('auth.forgotPassword')}
                  </Link>
                ) : null}
              </div>
              <PasswordInput
                id="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-10 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {loading ? t('auth.submitting') : copy.cta}
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
