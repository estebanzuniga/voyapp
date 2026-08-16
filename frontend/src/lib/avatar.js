export function getInitials(user) {
  if (!user) return ''
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
}
