import { Link } from 'react-router-dom'
import { formatDateRange } from '../lib/dates'
import { EyeIcon, ShareIcon } from './Icons'

export function TripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-accent"
    >
      <h3 className="font-display text-lg text-ink text-balance">{trip.title}</h3>
      <p className="text-sm text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
      {!trip.isOwner ? (
        <span className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          {trip.myPermission === 'EDITOR' ? <ShareIcon size={12} /> : <EyeIcon size={12} />}
          Shared with you
        </span>
      ) : null}
    </Link>
  )
}
