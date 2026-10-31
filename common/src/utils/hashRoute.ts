interface UrlParts {
  pathname: string
  search: string
  hash: string
}

const HASH_ROUTE_PREFIX = '#/'

/**
 * When embedded in the workplace, the app routes are addressed with a hash
 * (`/#/events/:uid`) whereas the standalone app uses plain paths
 * (`/events/:uid`). The fragment never reaches the server, so the redirection
 * can only happen client side.
 *
 * Returns the plain path equivalent of a hash-style URL, preserving the query
 * parameters found both before and within the fragment, or null when the URL
 * is not hash-style.
 */
export function toPathRoute(location: UrlParts): string | null {
  if (!location.hash.startsWith(HASH_ROUTE_PREFIX)) {
    return null
  }

  // Parsed as a path of a fixed origin: as a reference, a leading `//` (or
  // `/\`) would be read as an authority.
  const target = new URL(`http://localhost${location.hash.slice(1)}`)
  const searchParams = new URLSearchParams(location.search)
  target.searchParams.forEach((value, key) => searchParams.append(key, value))
  const search = searchParams.toString()

  // Empty segments survive dot-segment removal (`/.//x` becomes `//x`): a
  // path starting with `//` would be resolved as another host.
  const pathname = target.pathname.replace(/^\/+/, '/')

  return `${pathname}${search ? `?${search}` : ''}${target.hash}`
}

/**
 * Rewrites a hash-style URL into its plain path equivalent. Must run before
 * the router history is created so that it reads the rewritten location.
 */
export function normalizeHashRoute(): void {
  const pathRoute = toPathRoute(window.location)
  if (pathRoute !== null) {
    window.history.replaceState(window.history.state, '', pathRoute)
  }
}
