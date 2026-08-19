import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { DELETE_TRIP_MUTATION } from '../graphql/mutations'
import { MY_TRIPS_QUERY } from '../graphql/queries'
import { useTranslation } from '../hooks/useTranslation'
import { formatDateRange, isTripInProgress } from '../lib/dates'
import { ConfirmDialog } from './ConfirmDialog'
import { EditTripModal } from './EditTripModal'
import { ShareModal } from './ShareModal'
import { EyeIcon, PencilIcon, ShareIcon, TrashIcon } from './Icons'

export function TripCard({ trip }) {
  const { t, locale } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [runDeleteTrip, { loading: deleting }] = useMutation(DELETE_TRIP_MUTATION, {
    refetchQueries: [{ query: MY_TRIPS_QUERY }],
    awaitRefetchQueries: true,
  })

  const canEdit = trip.myPermission === 'EDITOR'

  async function handleConfirmDelete() {
    setDeleteError(null)
    try {
      await runDeleteTrip({ variables: { id: trip.id } })
      setIsConfirmingDelete(false)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-accent">
      {/* Card menu buttons sit outside this Link (not nested inside it) so
          tapping one doesn't also trigger the card's own navigation. */}
      <Link to={`/trips/${trip.id}`} className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg text-ink text-balance">{trip.title}</h3>
          {isTripInProgress(trip.startDate, trip.endDate) ? (
            <span className="mt-0.5 flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
              {t('tripCard.inProgress')}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted">{formatDateRange(trip.startDate, trip.endDate, locale)}</p>
        {!trip.isOwner ? (
          <span className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
            {trip.myPermission === 'EDITOR' ? <ShareIcon size={12} /> : <EyeIcon size={12} />}
            {t('tripCard.sharedWithYou')}
          </span>
        ) : null}
      </Link>

      {canEdit || trip.isOwner ? (
        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={t('tripCard.editAria', { title: trip.title })}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <PencilIcon size={16} />
            </button>
          ) : null}
          {trip.isOwner ? (
            <button
              type="button"
              onClick={() => setIsSharing(true)}
              aria-label={t('tripCard.shareAria', { title: trip.title })}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ShareIcon size={16} />
            </button>
          ) : null}
          {trip.isOwner ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleteError(null)
                setIsConfirmingDelete(true)
              }}
              aria-label={t('tripCard.deleteAria', { title: trip.title })}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <TrashIcon size={16} />
            </button>
          ) : null}
        </div>
      ) : null}

      {isEditing ? <EditTripModal trip={trip} onClose={() => setIsEditing(false)} /> : null}

      {isSharing ? <ShareModal tripId={trip.id} onClose={() => setIsSharing(false)} /> : null}

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={t('tripDetail.deleteTripTitle')}
          message={t('tripDetail.deleteTripMessage', { title: trip.title })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          loading={deleting}
          error={deleteError}
        />
      ) : null}
    </div>
  )
}
