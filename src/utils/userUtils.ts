import { userData } from "../features/User/userDataTypes";

/**
 * Get user display name for UI display
 * Returns full name if available, otherwise email, or empty string as fallback
 * @param user - User data object
 * @returns Display name string
 */
export function getUserDisplayName(user: userData | null | undefined): string {
  if (!user) {
    return "";
  }

  if (user.name && user.family_name) {
    return `${user.name} ${user.family_name}`;
  }

  return user.email || "";
}
