const sequenceOf = (token: string): number | undefined => {
  const match = /(\d+)$/.exec(token)
  return match ? Number(match[1]) : undefined
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
 * Tokens are opaque in general; sabre numbers them, which is what is compared.
 * When they cannot be compared, the one already held stays: at worst a sync
 * replays more.
 */
export const oldestSyncToken = (
  current: string | undefined,
  incoming: string | undefined
): string | undefined => {
  if (!current) return incoming
  if (!incoming) return current
  const held = sequenceOf(current)
  const received = sequenceOf(incoming)
  if (held === undefined || received === undefined) return current
  return received < held ? incoming : current
}
