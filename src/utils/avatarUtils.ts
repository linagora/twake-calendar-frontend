import { nameToColor } from "@linagora/twake-mui";

/**
 * Generate a gradient color from a string
 * @param str - String to generate color from
 * @returns Color name for gradient
 */
export function stringToGradient(str: string): string | undefined {
  if (!str) return undefined;
  return nameToColor(str);
}
