const dayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function formatDate(isoDate) {
  return dayFormatter.format(new Date(`${isoDate}T00:00:00`))
}

export function formatFullDate(isoDate) {
  return fullDateFormatter.format(new Date(`${isoDate}T00:00:00`))
}

export function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export function formatTime(isoTime) {
  // The Time scalar round-trips as "HH:MM:SS" - always show it as plain
  // 24h "HH:MM" (no seconds, no AM/PM), regardless of the viewer's locale.
  return isoTime.slice(0, 5)
}

export function enumerateDates(startDate, endDate) {
  const dates = []
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
