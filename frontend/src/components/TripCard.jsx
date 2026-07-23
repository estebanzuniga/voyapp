const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function formatRange(startDate, endDate) {
  const start = dateFormatter.format(new Date(`${startDate}T00:00:00`))
  const end = dateFormatter.format(new Date(`${endDate}T00:00:00`))
  return `${start} – ${end}`
}

export function TripCard({ trip }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="font-display text-lg text-ink text-balance">{trip.title}</h3>
      <p className="text-sm text-muted">{formatRange(trip.startDate, trip.endDate)}</p>
    </div>
  )
}
