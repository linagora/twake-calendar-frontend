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

/**
 * Get initials from a name string (max 2 characters)
 * @param name - Name string like "John Doe", "Alice", or "john.doe@email.com"
 * @returns Initials like "JD", "A", or "J"
 */
export function getInitials(name: string): string {
  if (!name) return "";

  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return trimmed[0]?.toUpperCase() ?? "";
}
