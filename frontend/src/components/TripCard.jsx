import { Link } from 'react-router-dom'
import { formatDateRange } from '../lib/dates'

export function TripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-accent"
    >
      <h3 className="font-display text-lg text-ink text-balance">{trip.title}</h3>
      <p className="text-sm text-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
    </Link>
  )
}
