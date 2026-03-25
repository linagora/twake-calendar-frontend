import { api } from "@/utils/apiUtils";
import { isValidEmail } from "@/utils/isValidEmail";

export async function getUserDataFromEmail(email: string) {
  if (!isValidEmail(email)) {
    return [];
  }
  const r = await api(`api/users?email=${encodeURIComponent(email)}`);
  const result: Array<Record<string, string>> = await r.json();
  return result;
}
