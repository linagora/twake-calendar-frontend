import { User } from "../../components/Attendees/PeopleSearch";
import { api } from "../../utils/apiUtils";

export async function getOpenPaasUser() {
  const user = await api.get(`api/user`).json();
  return user;
}

export async function searchUsers(
  query: string,
  objectTypes: string[] = ["user", "contact"]
): Promise<User[]> {
  const response: any[] = await api
    .post(`api/people/search`, {
      body: JSON.stringify({
        limit: 10,
        objectTypes,
        q: query,
      }),
    })
    .json();

  return response.map((user) => ({
    email: user.emailAddresses?.[0]?.value || "",
    displayName:
      user.names?.[0]?.displayName || user.emailAddresses?.[0]?.value,
    avatarUrl: user.photos?.[0]?.url || "",
    openpaasId: user.id || "",
  }));
}

export async function getUserDetails(id: string) {
  const user = await api.get(`api/users/${id}`).json();
  return user;
}

export interface UserConfigurationUpdates {
  language?: string;
  notifications?: Record<string, any>;
  timezone?: string;
  [key: string]: any;
}

export async function updateUserConfigurations(
  updates: UserConfigurationUpdates
) {
  const configs: Array<{
    name: string;
    configurations: Array<{ name: string; value: any }>;
  }> = [];

  const coreConfigs: Array<{ name: string; value: any }> = [];

  if (updates.language !== undefined) {
    coreConfigs.push({ name: "language", value: updates.language });
  }
  if (updates.notifications !== undefined) {
    coreConfigs.push({ name: "notifications", value: updates.notifications });
  }
  if (updates.timezone !== undefined) {
    coreConfigs.push({ name: "timezone", value: updates.timezone });
  }

  if (coreConfigs.length > 0) {
    configs.push({
      name: "core",
      configurations: coreConfigs,
    });
  }

  return await api.put(`api/configurations?scope=user`, {
    json: configs,
  });
}
