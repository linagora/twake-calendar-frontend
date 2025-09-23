import { useState, useRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  getTempCalendarsListAsync,
  removeTempCal,
} from "../../features/Calendars/CalendarSlice";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import { User, PeopleSearch } from "../Attendees/PeopleSearch";

export function TempCalendarsInput({
  setAnchorEl,
  setTempEvent,
  selectedCalendars,
  setSelectedCalendars,
}: {
  setAnchorEl: Function;
  setTempEvent: Function;
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const [tempUsers, setTempUsers] = useState<User[]>([]);
  const dispatch = useAppDispatch();
  const tempcalendars =
    useAppSelector((state) => state.calendars.templist) ?? {};
  const calendars = useAppSelector((state) => state.calendars.list);

  const prevUsersRef = useRef<User[]>([]);

  const handleUserChange = async (_: any, users: User[]) => {
    setTempUsers(users);

    const prevUsers = prevUsersRef.current;

    const addedUsers = users.filter(
      (u) => !prevUsers.some((p) => p.email === u.email)
    );
    const removedUsers = prevUsers.filter(
      (p) => !users.some((u) => u.email === p.email)
    );

    prevUsersRef.current = users;

    const { calendarsToImport, calendarsToToggle } = getCalendarsFromUsersDelta(
      addedUsers,
      buildEmailToCalendarMap(calendars),
      selectedCalendars
    );

    if (calendarsToImport.length > 0) {
      calendarsToImport.forEach(
        async (c) => await dispatch(getTempCalendarsListAsync(c))
      );
    }

    if (calendarsToToggle.length > 0) {
      setSelectedCalendars((prev: string[]) => [
        ...new Set([...prev, ...calendarsToToggle]),
      ]);
    }

    for (const user of removedUsers) {
      const calIds = buildEmailToCalendarMap(tempcalendars).get(user.email);
      calIds?.forEach((id) => dispatch(removeTempCal(id)));
    }
  };

  const handleToggleEventPreview = () => {
    const newEvent: CalendarEvent = {
      title: "New Event",
      attendee: tempUsers.map((u) => ({
        cal_address: u.email,
        partstat: "NEED-ACTION",
        role: "REQ-PARTICIPANT",
        rsvp: "TRUE",
        cutype: "INDIVIDUAL",
      })),
    } as CalendarEvent;

    setTempEvent(newEvent);
    setAnchorEl(document.body);
  };

  return (
    <PeopleSearch
      selectedUsers={tempUsers}
      onChange={handleUserChange}
      onToggleEventPreview={handleToggleEventPreview}
    />
  );
}

function getCalendarsFromUsersDelta(
  addedUsers: User[],
  emailToCalendarId: Map<string, string[]>,
  selectedCalendars: string[]
) {
  const selectedSet = new Set(selectedCalendars);

  const calendarsToImport: User[] = [];
  const calendarsToToggle: string[] = [];

  for (const user of addedUsers) {
    const calIds = emailToCalendarId.get(user.email) ?? [];

    if (!calIds || calIds.every((calId) => !selectedSet.has(calId))) {
      calendarsToImport.push(user);
    } else {
      // calIds.forEach((calId) => calendarsToToggle.push(calId));
    }
  }

  return { calendarsToImport, calendarsToToggle };
}

function buildEmailToCalendarMap(calRecord: Record<string, Calendars>) {
  const map = new Map<string, string[]>();
  for (const [id, cal] of Object.entries(calRecord)) {
    cal.ownerEmails?.forEach((email) => {
      const existing = map.get(email);
      if (existing) {
        existing.push(id);
      } else {
        map.set(email, [id]);
      }
    });
  }
  return map;
}
