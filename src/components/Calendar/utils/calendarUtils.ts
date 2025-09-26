import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";
import { getCalendarDetailAsync } from "../../../features/Calendars/CalendarSlice";

export const updateSlotLabelVisibility = (currentTime: Date) => {
  const slotLabels = document.querySelectorAll(".fc-timegrid-slot-label");
  const isCurrentWeekOrDay = checkIfCurrentWeekOrDay();

  if (!isCurrentWeekOrDay) {
    slotLabels.forEach((label) => {
      const labelElement = label as HTMLElement;
      labelElement.style.opacity = "1";
    });
    return;
  }

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  slotLabels.forEach((label) => {
    const labelElement = label as HTMLElement;
    const timeText = labelElement.textContent?.trim();

    if (timeText && timeText.match(/^\d{1,2}:\d{2}$/)) {
      const [hours, minutes] = timeText.split(":").map(Number);
      const labelMinutes = hours * 60 + minutes;

      let timeDiff = Math.abs(currentMinutes - labelMinutes);

      if (timeDiff > 12 * 60) {
        timeDiff = 24 * 60 - timeDiff;
      }

      if (timeDiff <= 15) {
        labelElement.style.opacity = "0.2";
      } else {
        labelElement.style.opacity = "1";
      }
    }
  });
};

const checkIfCurrentWeekOrDay = (): boolean => {
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
        return { ...e, editable: true };
      }
      return { ...e, editable: false };
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

export function getCalendarVisibility(
  acl: AclEntry[],
  ownerId: string
): "private" | "free-busy" | "public" {
  let hasRead = false;
  let hasFreeBusy = false;

  for (const entry of acl) {
    // Skip owner
    if (entry.principal.includes(ownerId)) continue;

    if (entry.privilege === "{DAV:}read") {
      hasRead = true;
      break; // highest visibility, can stop
    }
    if (entry.privilege === "{urn:ietf:params:xml:ns:caldav}read-free-busy") {
      hasFreeBusy = true;
    }
  }

  if (hasRead) return "public";
  if (hasFreeBusy) return "free-busy";
  return "private";
}
