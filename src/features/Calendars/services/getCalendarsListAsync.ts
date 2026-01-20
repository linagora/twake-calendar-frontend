import { getOpenPaasUser, getUserDetails } from "@/features/User/userAPI";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendars } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";
import { Calendar } from "../CalendarTypes";
import { normalizeCalendar } from "../utils/normalizeCalendar";

export const getCalendarsListAsync = createAsyncThunk<
  { importedCalendars: Record<string, Calendar>; errors: string },
  void,
  { rejectValue: RejectedError; state: any }
>("calendars/getCalendars", async (_, { rejectWithValue, getState }) => {
  const state = getState() as any;
  const existingCalendars = state.calendars.list || {};
  const existingUser = { id: state.user?.userData?.openpaasId || undefined };
  try {
    const fetchedCalendars: Record<string, Calendar> = {};
    const user = existingUser.id
      ? existingUser
      : ((await getOpenPaasUser()) as Record<string, string>);
    const calendars = (await getCalendars(user.id)) as Record<string, any>;
    const rawCalendars = calendars._embedded["dav:calendar"] as Record<
      string,
      any
    >[];
    const errors: string[] = [];

    const normalizedCalendars = rawCalendars.map((cal) =>
      normalizeCalendar(cal)
    );

    const uniqueOwnerIds = Array.from(
      new Set(normalizedCalendars.map(({ ownerId }) => ownerId).filter(Boolean))
    );

    const ownerDataMap = new Map<string, any>();
    const OWNER_BATCH_SIZE = 20;

    const fetchOwnerData = async (ownerId: string) => {
      try {
        const data = await getUserDetails(ownerId);
        ownerDataMap.set(ownerId, data);
      } catch (error: any) {
        console.error(`Failed to fetch user details for ${ownerId}:`, error);
        ownerDataMap.set(ownerId, {
          firstname: "",
          lastname: "Unknown User",
          emails: [],
        });
        errors.push(formatReduxError(error));
      }
    };

    for (let i = 0; i < uniqueOwnerIds.length; i += OWNER_BATCH_SIZE) {
      const chunk = uniqueOwnerIds.slice(i, i + OWNER_BATCH_SIZE);
      await Promise.all(chunk.map((ownerId) => fetchOwnerData(ownerId)));
    }

    normalizedCalendars.forEach(
      ({ cal, description, delegated, link, id, ownerId, visibility }) => {
        const ownerData = ownerDataMap.get(ownerId) || {
          firstname: "",
          lastname: "Unknown User",
          emails: [],
        };
        const name =
          ownerId !== user.id && cal["dav:name"] === "#default"
            ? `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${ownerData.lastname}` +
              "'s calendar"
            : cal["dav:name"];

        const color = {
          light: cal["apple:color"] ?? "#006BD8",
          dark: cal["X-TWAKE-Dark-theme-color"] ?? "#FFF",
        };
        fetchedCalendars[id] = {
          id,
          name,
          link,
          owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${ownerData.lastname}`,
          ownerEmails: ownerData.emails,
          description,
          delegated,
          color,
          visibility,
          events: {},
        };
      }
    );

    const importedCalendars: Record<string, Calendar> = {};

    const fetchedIds = new Set(Object.keys(fetchedCalendars));
    const existingIds = new Set(Object.keys(existingCalendars));

    const added = [...fetchedIds].filter((id) => !existingIds.has(id));

    existingIds.forEach((id) => {
      if (fetchedIds.has(id)) {
        const existingCal = existingCalendars[id];
        const fetchedCal = fetchedCalendars[id];

        if (fetchedCal) {
          importedCalendars[id] = {
            ...fetchedCal,
            color: existingCal.color,
            events: existingCal.events || {},
          };
        }
      }
    });

    // Add new calendars
    added.forEach((id) => {
      importedCalendars[id] = fetchedCalendars[id];
    });

    return {
      importedCalendars,
      errors: errors.join("\n"),
    };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
