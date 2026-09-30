// A stop with no category (or a categoryId that no longer resolves to one
// of the trip's categories) falls into this bucket - shared between the
// city map's marker fallback and the category filter chips so both treat
// "no category" as one consistent, filterable group instead of two
// different notions of "uncategorized".
export const UNCATEGORIZED_KEY = '__uncategorized__'
export const UNCATEGORIZED_EMOJI = '📍'

export function categoryKeyForStop(stop) {
  return stop.categoryId ?? UNCATEGORIZED_KEY
}
