import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { ACCEPT_SHARE_INVITE_MUTATION } from '../graphql/mutations'
import { SHARE_INVITE_PREVIEW_QUERY } from '../graphql/queries'
import { Skeleton } from '../components/Skeleton'

export function InviteAcceptPage() {
  const { token } = useParams()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error } = useQuery(SHARE_INVITE_PREVIEW_QUERY, { variables: { token } })
  const [runAccept, { loading: accepting, error: acceptError }] = useMutation(ACCEPT_SHARE_INVITE_MUTATION)

  const preview = data?.shareInvitePreview
  const redirectTarget = `/invite/${token}`

  async function handleAccept() {
    const { data: acceptData } = await runAccept({ variables: { token } })
    navigate(`/trips/${acceptData.acceptShareInvite.id}`)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-xl text-ink">VoyApp</p>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

        {!loading && !error && preview && !preview.valid ? (
          <p className="text-muted">This invite link is invalid or has expired. Ask whoever shared the trip for a fresh one.</p>
        ) : null}

        {preview?.valid ? (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-lg text-ink text-balance">
                You've been invited to "{preview.tripTitle}"
              </h1>
              <p className="text-sm text-muted">
                You'll be able to {preview.permission === 'EDITOR' ? 'view and edit' : 'view'} this trip.
              </p>
            </div>

            {acceptError ? <p className="text-sm text-red-600">{acceptError.message}</p> : null}

            {isAuthenticated ? (
              <button
                type="button"
                disabled={accepting}
                onClick={handleAccept}
                className="cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {accepting ? 'Joining…' : 'Accept invite'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted">Log in or create a VoyApp account to accept it.</p>
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="rounded-lg bg-accent px-4 py-3 text-center font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Log in to accept
                </Link>
                <Link
                  to={`/signup?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="rounded-lg border border-border px-4 py-3 text-center font-semibold text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Create an account
                </Link>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
