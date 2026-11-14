/** Match Drive public links against the configured workplace host template.
 * `{localpart}` matches one instance label, including other users' instances.
 */
export function isDriveAttachmentUrl(
  uri: string,
  workplaceFqdnFallback: string | undefined
): boolean {
  if (!workplaceFqdnFallback) return false
  try {
    const url = new URL(uri)
    if (url.username || url.password) return false
    const escapeRegex = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const instanceLabel = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
    const hostPattern = workplaceFqdnFallback
      .toLowerCase()
      .split('{localpart}')
      .map(escapeRegex)
      .join(instanceLabel)
    return (
      new RegExp(`^${hostPattern}$`).test(url.host) &&
      (url.pathname === '/public' || url.pathname.startsWith('/public/'))
    )
  } catch {
    return false
  }
}
