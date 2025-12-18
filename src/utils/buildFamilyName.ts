export function buildFamilyName(
  firstName: string | undefined,
  lastName: string | undefined,
  email: string
): string {
  const trimmedFirstName = firstName?.trim() || "";
  const trimmedLastName = lastName?.trim() || "";
  const fullName = [trimmedFirstName, trimmedLastName]
    .filter(Boolean)
    .join(" ");
  return fullName || email;
}
