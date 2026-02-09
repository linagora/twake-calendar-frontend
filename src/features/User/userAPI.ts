import { User } from "@/components/Attendees/PeopleSearch";
import { api } from "@/utils/apiUtils";
import { OpenPaasUserData } from "./type/OpenPaasUserData";
import {
  ConfigurationItem,
  ModuleConfiguration,
  SearchResponseItem,
} from "./userDataTypes";

export async function getOpenPaasUser() {
  const user = await api.get(`api/user`);
  return user.json();
}

export async function searchUsers(
  query: string,
  objectTypes: string[] = ["user", "contact"]
): Promise<User[]> {
  const response: SearchResponseItem[] = await api
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

export async function getUserDetails(id: string): Promise<OpenPaasUserData> {
  const user = await api.get(`api/users/${id}`).json();
  return user as OpenPaasUserData;
}

export interface UserConfigurationUpdates {
  language?: string;
  notifications?: Record<string, unknown>;
  timezone?: string | null;
  displayWeekNumbers?: boolean;
  previousConfig?: Record<string, unknown>;
  alarmEmails?: boolean;
  hideDeclinedEvents?: boolean;
}

export async function updateUserConfigurations(
  updates: UserConfigurationUpdates
): Promise<Response | { status: number }> {
  const coreConfigs: ConfigurationItem[] = [];
  const calendarConfigs: ConfigurationItem[] = [];
  const esnCalendarConfigs: ConfigurationItem[] = [];

  if (updates.language !== undefined) {
    coreConfigs.push({ name: "language", value: updates.language });
  }
  if (updates.notifications !== undefined) {
    coreConfigs.push({ name: "notifications", value: updates.notifications });
  }
  if (updates.timezone !== undefined) {
    const previousDatetime = updates.previousConfig?.datetime as
      | { timeZone?: string }
      | undefined;
    coreConfigs.push({
      name: "datetime",
      value: {
        ...previousDatetime,
        timeZone: updates.timezone,
      },
    });
  }
  if (updates.alarmEmails !== undefined) {
    calendarConfigs.push({
      name: "alarmEmails",
      value: updates.alarmEmails,
    });
  }
  if (updates.hideDeclinedEvents !== undefined) {
    esnCalendarConfigs.push({
      name: "hideDeclinedEvents",
      value: updates.hideDeclinedEvents,
    });
  }
  if (updates.displayWeekNumbers !== undefined) {
    calendarConfigs.push({
      name: "displayWeekNumbers",
      value: updates.displayWeekNumbers,
    });
  }

  const modules: ModuleConfiguration[] = [];

  if (coreConfigs.length > 0) {
    modules.push({
      name: "core",
      configurations: coreConfigs,
    });
  }

  if (calendarConfigs.length > 0) {
    modules.push({
      name: "calendar",
      configurations: calendarConfigs,
    });
  }
  if (esnCalendarConfigs.length > 0) {
    modules.push({
      name: "linagora.esn.calendar",
      configurations: esnCalendarConfigs,
    });
  }

  if (modules.length === 0) {
    return Promise.resolve({ status: 204 });
  }

  return await api.patch(`api/configurations?scope=user`, {
    json: modules,
  });
}
