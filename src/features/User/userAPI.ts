import { api } from "../../utils/apiUtils";

export default async function getOpenPaasUser() {
  const user = await api.get(`api/user`).json();
  return user;
}

export async function searchUsers(query: string) {
  const response: any[] = await api
    .post(`api/people/search`, {
      body: JSON.stringify({
        limit: 10,
        objectTypes: ["user", "group", "contact", "ldap"],
        q: query,
      }),
    })
    .json();

  return response
    .filter((user) => user.objectType === "user")
    .map((user) => ({
      email: user.emailAddresses?.[0]?.value || "",
      displayName:
        user.names?.[0]?.displayName || user.emailAddresses?.[0]?.value,
      avatarUrl: user.photos?.[0]?.url || "",
    }));
}

export async function getUserDetails(id: string) {
  const user = await api.get(`api/users/${id}`).json();
  return user;
}
