import React from "react";
import { MenuItem } from "@mui/material";
import { Calendar} from "../../features/Calendars/CalendarTypes";
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
