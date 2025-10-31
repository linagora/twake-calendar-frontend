import React from "react";
import { MenuItem } from "@mui/material";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { CalendarName } from "./CalendarName";

export function CalendarItemList(
  userPersonnalCalendars: Calendars[]
): React.ReactNode {
  return Object.values(userPersonnalCalendars).map((calendar) => (
    <MenuItem key={calendar.id} value={calendar.id}>
      <CalendarName calendar={calendar} />
    </MenuItem>
  ));
}
