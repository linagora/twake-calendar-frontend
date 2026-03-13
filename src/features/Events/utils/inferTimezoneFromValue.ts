import { resolveTimezoneId } from "@/utils/timezone";

export function inferTimezoneFromValue(
  params: Record<string, string> | undefined
): string | undefined {
  if (!params) {
    return undefined;
  }

  const tzParam =
    params.tzid || params.TZID || params.Tzid || params.tZid || params.tzId;

  if (tzParam) {
    const resolved = resolveTimezoneId(tzParam);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}
