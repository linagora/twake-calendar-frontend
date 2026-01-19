import { Calendar } from "@/features/Calendars/CalendarTypes";
import { MenuItem } from "@linagora/twake-mui";
import React from "react";
import { CalendarName } from "./CalendarName";

export function CalendarItemList(
  userPersonalCalendars: Calendar[]
): React.ReactNode {
  return Object.values(userPersonalCalendars).map((calendar) => (
    <MenuItem key={calendar.id} value={calendar.id}>
      <CalendarName calendar={calendar} />
    </MenuItem>
  ));
}
