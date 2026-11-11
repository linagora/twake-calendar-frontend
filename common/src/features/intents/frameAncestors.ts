/**
 * Who frames the page, against the origins the stack allows to frame a
 * service of the intent (`frameAncestors`, the `frame-ancestors` it sets on
 * the services it serves):
 * - `trusted`: every ancestor is one of them
 * - `untrusted`: an ancestor is not (another page frames the client app),
 *   or the stack gives them in another shape
 * - `unchecked`: the stack does not give them (before
 *   linagora/cozy-stack `frameAncestors`), or the browser does not tell the
 *   ancestors (Firefox has no `location.ancestorOrigins`): the handshake of
 *   cozy-interapp is the only guard
 */
export type FrameCheck = 'trusted' | 'untrusted' | 'unchecked'

function readOrigins(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const origins: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    origins.push(item)
  }
  return origins
}

/** The origins of the pages that frame this one, innermost first; null when the browser does not tell */
export function readAncestorOrigins(): readonly string[] | null {
  // The DOM types have it, Firefox does not
  if (!('ancestorOrigins' in window.location)) return null
  return Array.from(window.location.ancestorOrigins)
}

export function checkFrameAncestors(
  allowed: unknown,
  ancestors: readonly string[] | null
): FrameCheck {
  // An older stack does not give them; given in another shape, they are not
  // trusted
  if (allowed === undefined || allowed === null || ancestors === null) {
    return 'unchecked'
  }
  const origins = readOrigins(allowed)
  if (origins === null) return 'untrusted'
  if (ancestors.length === 0) return 'untrusted'
  return ancestors.every(ancestor => origins.includes(ancestor))
    ? 'trusted'
    : 'untrusted'
}
