import React from "react";
import { MenuItem } from "@mui/material";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { CalendarName } from "./CalendarName";

export function CalendarItemList(
  userPersonnalCalendars: Calendars[]
): React.ReactNode {
  return Object.values(userPersonnalCalendars).map((calendar, index) => (
    <MenuItem key={index} value={index}>
      <CalendarName calendar={calendar} />
    </MenuItem>
  ));
}
