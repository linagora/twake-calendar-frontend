// sabre's sync tokens: a namespace, then the sequence number of the change
const SABRE_SYNC_TOKEN = /^(https?:\/\/\S+\/ns\/sync\/)(\d+)$/

const parse = (
  token: string
): { namespace: string; sequence: number } | undefined => {
  const match = SABRE_SYNC_TOKEN.exec(token)
  return match ? { namespace: match[1], sequence: Number(match[2]) } : undefined
}

/**
 * The sync token a calendar may claim once a range of it is loaded.
 *
 * Ranges load at different times, each answering with the token of that
 * moment. The events in the store are only as fresh as the oldest of them:
 * keeping the latest one would tell a later sync that changes made in between
 * were already seen, and the range loaded first would never get them. Syncing
 * from the oldest may replay a change already loaded, which is harmless.
 *
 * Tokens are opaque in general; sabre numbers them, which is what is compared,
 * and only within one namespace. When they cannot be compared -- another
 * format, another namespace -- the one already held stays: at worst a sync
 * replays more.
 */
export const oldestSyncToken = (
  current: string | undefined,
  incoming: string | undefined
): string | undefined => {
  if (!current) return incoming
  if (!incoming) return current
  const held = parse(current)
  const received = parse(incoming)
  if (!held || !received || held.namespace !== received.namespace) {
    return current
  }
  return received.sequence < held.sequence ? incoming : current
}
