import { resolveTimezoneId } from "@/utils/timezone";

export function inferTimezoneFromValue(
  params: Record<string, string> | undefined
): string | undefined {
  if (!params) {
    return undefined;
  }

  const tzKey = Object.keys(params).find((k) => k.toLowerCase() === "tzid");
  const tzParam = tzKey ? params[tzKey] : undefined;

  if (tzParam) {
    const resolved = resolveTimezoneId(tzParam);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}
