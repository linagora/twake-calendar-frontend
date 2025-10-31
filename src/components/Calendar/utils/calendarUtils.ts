import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";
import { getCalendarDetailAsync } from "../../../features/Calendars/CalendarSlice";
import { SlotLabelContentArg } from "@fullcalendar/core";
import moment from "moment-timezone";
import { refreshSingularCalendar } from "../../Event/utils/eventUtils";
import { ThunkDispatch } from "@reduxjs/toolkit";

export const updateSlotLabelVisibility = (
  currentTime: Date,
  slotLabel: SlotLabelContentArg,
  timezone: string
) => {
  const isCurrentWeekOrDay = checkIfCurrentWeekOrDay();

  if (!isCurrentWeekOrDay) {
    return "fc-timegrid-slot-label";
  }

  const current = moment.tz(currentTime, timezone);
  const currentMinutes = current.hours() * 60 + current.minutes();
  const timeText = slotLabel?.text?.trim();

  if (timeText && timeText.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = timeText.split(":").map(Number);
    const labelMinutes = hours * 60 + minutes;

    let timeDiff = Math.abs(currentMinutes - labelMinutes);

    if (timeDiff > 12 * 60) {
      timeDiff = 24 * 60 - timeDiff;
    }

    if (timeDiff <= 15) {
      return "timegrid-slot-label-hidden";
    }
  }

  return "fc-timegrid-slot-label";
};

export const checkIfCurrentWeekOrDay = (): boolean => {
  const todayColumn = document.querySelector(".fc-day-today");

  if (!todayColumn) {
    return false;
  }

  const nowIndicator = document.querySelector(
    ".fc-timegrid-now-indicator-arrow"
  );
  return !!nowIndicator;
};

export const eventToFullCalendarFormat = (
  filteredEvents: CalendarEvent[],
  filteredTempEvents: CalendarEvent[],
  userId: string | undefined
) => {
  return filteredEvents
    .concat(filteredTempEvents.map((e) => ({ ...e, temp: true })))
    .map((e) => {
      if (e.calId.split("/")[0] === userId) {
        return { ...e, colors: e.color, editable: true };
      }
      return { ...e, colors: e.color, editable: false };
    });
};

export const extractEvents = (
  selectedCalendars: string[],
  calendars: Record<string, Calendars>
) => {
  let filteredEvents: CalendarEvent[] = [];
  selectedCalendars.forEach((id) => {
    if (calendars[id] && calendars[id].events) {
      filteredEvents = filteredEvents
        .concat(
          Object.keys(calendars[id].events).map(
            (eventid) => calendars[id].events[eventid]
          )
        )
        .filter((event) => !(event.status === "CANCELLED"));
    }
  });
  return filteredEvents;
};

export const updateCalsDetails = (
  selectedCalendars: string[],
  previousSelectedCalendars: string[],
  pending: boolean,
  rangeKey: string,
  previousRangeKey: string,
  dispatch: Function,
  calendarRange: { start: Date; end: Date },
  calType?: "temp"
) => {
  if (pending || !rangeKey) return;

  const newCalendars = selectedCalendars.filter(
    (id) => !previousSelectedCalendars.includes(id)
  );

  newCalendars.forEach((id) => {
    dispatch(
      getCalendarDetailAsync({
        calId: id,
        match: {
          start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
          end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
        },
        calType,
      })
    );
  });

  if (rangeKey !== previousRangeKey) {
    selectedCalendars?.forEach((id) => {
      if (id) {
        dispatch(
          getCalendarDetailAsync({
            calId: id,
            match: {
              start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
              end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
            },
            calType,
          })
        );
      }
    });
  }
};

interface AclEntry {
  privilege: string;
  principal: string;
  protected: boolean;
}

export function getCalendarVisibility(acl: AclEntry[]): "private" | "public" {
  let hasRead = false;
  let hasFreeBusy = false;
  if (acl) {
    for (const entry of acl) {
      if (entry.principal !== "{DAV:}authenticated") continue;

      if (entry.privilege === "{DAV:}read") {
        hasRead = true;
        break; // highest visibility, can stop
      }
    }
  }
  if (hasRead) return "public";
  return "private";
}

export async function updateTempCalendar(
  tempcalendars: Record<string, Calendars>,
  event: CalendarEvent,
  dispatch: ThunkDispatch<any, any, any>,
  calendarRange: { start: Date; end: Date }
) {
  if (tempcalendars && event?.attendee) {
    const attendeesEmails = event.attendee
      .map((a) => a.cal_address)
      .filter(Boolean);

    const tempCalendarValues = Object.values(tempcalendars);

    for (const tempCalendar of tempCalendarValues) {
      const ownerEmails = tempCalendar.ownerEmails || [];

      // Check if any of the attendees are owners of this temp calendar
      const isOwnerAttendee = ownerEmails.some((ownerEmail) =>
        attendeesEmails.includes(ownerEmail)
      );
      if (isOwnerAttendee) {
        await refreshSingularCalendar(
          dispatch,
          tempCalendar,
          calendarRange,
          "temp"
        );
      }
    }
  }
}
