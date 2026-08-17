// Formatters are cached per locale (constructing an Intl.DateTimeFormat
// isn't free) rather than built once at module load, since which locale we
// need now depends on the signed-in user's chosen language instead of being
// fixed for the whole app - see useTranslation's `locale`.
const dayFormatters = new Map()
const fullDateFormatters = new Map()

function dayFormatter(locale) {
  if (!dayFormatters.has(locale)) {
    dayFormatters.set(locale, new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }))
  }
  return dayFormatters.get(locale)
}

function fullDateFormatter(locale) {
  if (!fullDateFormatters.has(locale)) {
    fullDateFormatters.set(
      locale,
      new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
    )
  }
  return fullDateFormatters.get(locale)
}

function capitalizeFirst(text) {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text
}

// `locale` defaults to the browser's own locale (same as passing `undefined`
// to Intl.DateTimeFormat) so any caller that doesn't have one handy - or
// hasn't been updated yet - keeps working exactly as before.
export function formatDate(isoDate, locale) {
  return dayFormatter(locale).format(new Date(`${isoDate}T00:00:00`))
}

export function formatFullDate(isoDate, locale) {
  return capitalizeFirst(fullDateFormatter(locale).format(new Date(`${isoDate}T00:00:00`)))
}

export function formatDateRange(startDate, endDate, locale) {
  return `${formatDate(startDate, locale)} – ${formatDate(endDate, locale)}`
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
