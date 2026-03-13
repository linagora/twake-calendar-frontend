/**
 * Normalize timezone by resolving aliases
 */

export function normalizeTimezone(
  timezone: string | undefined | null,
  resolveTimezone: (tz: string) => string
): string | null {
  if (!timezone) return null;
  return resolveTimezone(timezone);
}
