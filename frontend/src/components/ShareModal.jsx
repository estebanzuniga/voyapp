import { Suspense, lazy, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  CREATE_SHARE_LINK_MUTATION,
  REMOVE_COLLABORATOR_MUTATION,
  REVOKE_SHARE_LINK_MUTATION,
  UPDATE_COLLABORATOR_PERMISSION_MUTATION,
} from '../graphql/mutations'
import { TRIP_SHARING_QUERY } from '../graphql/queries'
import { ConfirmDialog } from './ConfirmDialog'
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from './Icons'
import { Modal } from './Modal'

const QRCodeImage = lazy(() => import('./QRCodeImage').then((module) => ({ default: module.QRCodeImage })))

const MAX_COLLABORATORS = 10

// A link is only shown - and copyable/scannable - for this long right after
// it's created, then it's hidden from this modal for good (it's still valid
// on the server until it's revoked or hits its 24h expiry; this is purely a
// "you get one chance to grab it" UI rule, same idea as a cloud provider
// showing you a new access key's secret exactly once).
const REVEAL_WINDOW_MS = 15000

const LINK_KINDS = [
  { permission: 'VIEWER', label: 'View-only links' },
  { permission: 'EDITOR', label: 'Editor links' },
]

function refetchSharing(tripId) {
  return { refetchQueries: [{ query: TRIP_SHARING_QUERY, variables: { id: tripId } }], awaitRefetchQueries: true }
}

function ShareLinkCard({ tripId, link, remainingMs }) {
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false)
  const [runRevoke, { loading: revoking, error: revokeError }] = useMutation(
    REVOKE_SHARE_LINK_MUTATION,
    refetchSharing(tripId),
  )

  const url = `${window.location.origin}/invite/${link.token}`
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000))

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRevoke() {
    await runRevoke({ variables: { tripId, linkId: link.id } })
    setIsConfirmingRevoke(false)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="w-0 flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy link"
          className="shrink-0 cursor-pointer rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((prev) => !prev)}
          aria-label="Show QR code"
          className={`shrink-0 cursor-pointer rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-accent ${
            showQr ? 'bg-surface-2 text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <QrCodeIcon size={18} />
        </button>
      </div>

      {showQr ? (
        <div className="flex justify-center py-2">
          <Suspense
            fallback={
              <div className="flex h-50 w-50 items-center justify-center text-sm text-muted">
                Loading…
              </div>
            }
          >
            <QRCodeImage value={url} size={200} />
          </Suspense>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 font-semibold text-accent">
          <AlertTriangleIcon size={13} />
          Copy it now — disappears in {secondsLeft}s
        </span>
        <button
          type="button"
          onClick={() => setIsConfirmingRevoke(true)}
          className="cursor-pointer font-semibold text-muted hover:text-red-600 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Revoke
        </button>
      </div>

      {isConfirmingRevoke ? (
        <ConfirmDialog
          title="Revoke link"
          message="Anyone who opens this specific link from now on will be turned away. Other links, and people who already joined, are unaffected."
          confirmLabel="Revoke"
          onConfirm={handleRevoke}
          onCancel={() => setIsConfirmingRevoke(false)}
          loading={revoking}
          error={revokeError?.message}
        />
      ) : null}
    </div>
  )
}

function ShareLinkSection({ tripId, permission, label, links }) {
  const [runCreate, { loading: creating, error: createError }] = useMutation(
    CREATE_SHARE_LINK_MUTATION,
    refetchSharing(tripId),
  )
  const [now, setNow] = useState(() => Date.now())

  const revealed = links
    .map((link) => ({ link, remainingMs: REVEAL_WINDOW_MS - (now - new Date(link.createdAt).getTime()) }))
    .filter(({ remainingMs }) => remainingMs > 0)
  const isLocked = revealed.length > 0
  const hasHiddenLinks = !isLocked && links.length > 0

  // Only ticks while a link actually needs to keep counting down - once the
  // last one's window closes, `isLocked` goes false and this effect's own
  // cleanup stops the interval, so it's not running for the whole time the
  // modal happens to be open.
  useEffect(() => {
    if (!isLocked) return undefined
    const interval = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(interval)
  }, [isLocked])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <button
          type="button"
          disabled={creating || isLocked}
          onClick={() => runCreate({ variables: { tripId, permission } })}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PlusIcon size={12} />
          {creating ? 'Generating…' : isLocked ? `Wait ${Math.ceil(revealed[0].remainingMs / 1000)}s` : 'New link'}
        </button>
      </div>

      {createError ? <p className="text-sm text-red-600">{createError.message}</p> : null}

      {revealed.length === 0 ? (
        <p className="text-sm text-muted">
          {hasHiddenLinks
            ? "A link was generated but already shown once - generate a new one to share it again."
            : `No ${permission === 'EDITOR' ? 'editor' : 'view-only'} links yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {revealed.map(({ link, remainingMs }) => (
            <ShareLinkCard key={link.id} tripId={tripId} link={link} remainingMs={remainingMs} />
          ))}
        </div>
      )}
    </div>
  )
}

function CollaboratorRow({ tripId, collaborator }) {
  const [runUpdate, { loading: updating, error: updateError }] = useMutation(
    UPDATE_COLLABORATOR_PERMISSION_MUTATION,
    refetchSharing(tripId),
  )
  const [runRemove, { loading: removing, error: removeError }] = useMutation(
    REMOVE_COLLABORATOR_MUTATION,
    refetchSharing(tripId),
  )
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  async function handleRemove() {
    await runRemove({ variables: { tripId, userId: collaborator.userId } })
    setIsConfirmingRemove(false)
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-ink">{collaborator.email}</span>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={collaborator.permission}
            disabled={updating}
            onChange={(event) =>
              runUpdate({
                variables: { tripId, userId: collaborator.userId, permission: event.target.value },
              })
            }
            className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-ink focus:outline-2 focus:outline-accent"
          >
            <option value="VIEWER">Can view</option>
            <option value="EDITOR">Can edit</option>
          </select>
          <button
            type="button"
            onClick={() => setIsConfirmingRemove(true)}
            aria-label={`Remove ${collaborator.email}`}
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>

      {updateError ? <p className="text-sm text-red-600">{updateError.message}</p> : null}

      {isConfirmingRemove ? (
        <ConfirmDialog
          title="Remove access"
          message={`${collaborator.email} will no longer be able to view or edit this trip.`}
          confirmLabel="Remove"
          onConfirm={handleRemove}
          onCancel={() => setIsConfirmingRemove(false)}
          loading={removing}
          error={removeError?.message}
        />
      ) : null}
    </div>
  )
}

export function ShareModal({ tripId, onClose }) {
  const { data, loading, error } = useQuery(TRIP_SHARING_QUERY, { variables: { id: tripId } })
  const trip = data?.trip
  const linksByPermission = { VIEWER: [], EDITOR: [] }
  for (const link of trip?.shareLinks ?? []) {
    linksByPermission[link.permission]?.push(link)
  }

  return (
    <Modal onClose={onClose} className="max-w-md">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      <div className="flex flex-col gap-5">
        <h2 className="font-display pr-6 text-lg text-ink text-balance">
          Share {trip ? `"${trip.title}"` : ''}
        </h2>

        {loading ? <p className="text-sm text-muted">Loading…</p> : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

        {trip ? (
          <>
            <div className="flex flex-col gap-4">
              {LINK_KINDS.map(({ permission, label }) => (
                <ShareLinkSection
                  key={permission}
                  tripId={tripId}
                  permission={permission}
                  label={label}
                  links={linksByPermission[permission]}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <UsersIcon size={16} />
                People with access ({trip.collaborators.length}/{MAX_COLLABORATORS})
              </h3>
              {trip.collaborators.length === 0 ? (
                <p className="text-sm text-muted">No one has accepted an invite yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {trip.collaborators.map((collaborator) => (
                    <CollaboratorRow key={collaborator.userId} tripId={tripId} collaborator={collaborator} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
