import { api } from "@/utils/apiUtils";

export async function getUserDataFromEmail(email: string) {
  const r = await api(`api/users?email=${encodeURIComponent(email)}`);
  const result: Array<Record<string, string>> = await r.json();
  return result;
}
