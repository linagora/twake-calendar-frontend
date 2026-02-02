import { refreshSingularCalendar } from "@/components/Event/utils/eventUtils";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { getCalendarDetailAsync } from "@/features/Calendars/services";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "@/utils/dateUtils";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { convertEventDateTimeToISO } from "@/utils/timezone";
import { SlotLabelContentArg } from "@fullcalendar/core";
import { ThunkDispatch } from "@reduxjs/toolkit";
import moment from "moment-timezone";
import { useI18n } from "twake-i18n";

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

export function formatEventChipTitle(e: CalendarEvent, t: Function) {
  if (!e.title) {
    return t("event.untitled");
  }
  return e.title === "Busy" && e.class === "PRIVATE"
    ? t("event.form.busy")
    : e.title;
}

export const eventToFullCalendarFormat = (
  filteredEvents: CalendarEvent[],
  filteredTempEvents: CalendarEvent[],
  userId: string | undefined
) => {
  const { t } = useI18n();
  return filteredEvents
    .concat(filteredTempEvents.map((e) => ({ ...e, temp: true })))
    .map((e) => {
      const eventTimezone = e.timezone || "Etc/UTC";
      const isAllDay = e.allday ?? false;
      const isPersonnalEvent = extractEventBaseUuid(e.calId) === userId;

      const convertedEvent: any = {
        ...e,
        title: formatEventChipTitle(e, t),
        colors: e.color,
        editable: isPersonnalEvent,
        priority: isPersonnalEvent ? 1 : 0,
      };

      if (!isAllDay && e.start && eventTimezone) {
        const startISO = convertEventDateTimeToISO(e.start, eventTimezone, {
          isAllDay,
        });
        if (startISO) {
          convertedEvent.start = startISO;
        }
      }

      if (!isAllDay && e.end && eventTimezone) {
        const endISO = convertEventDateTimeToISO(e.end, eventTimezone, {
          isAllDay,
        });
        if (endISO) {
          convertedEvent.end = endISO;
        }
      }

      return convertedEvent;
    });
};

export const extractEvents = (
  selectedCalendars: string[],
  calendars: Record<string, Calendar>,
  userAddress?: string,
  hideDeclinedEvents?: boolean | null
) => {
  const allEvents: CalendarEvent[] = [];

  selectedCalendars.forEach((id) => {
    const calendar = calendars[id];
    if (calendar?.events) {
      allEvents.push(...Object.values(calendar.events));
    }
  });

  return allEvents
    .filter((event) => event.status !== "CANCELLED")
    .filter(
      (event) =>
        !(
          hideDeclinedEvents &&
          event.attendee?.some(
            (a) => a.cal_address === userAddress && a.partstat === "DECLINED"
          )
        )
    );
};

export const updateCalsDetails = (
  selectedCalendars: string[],
  previousSelectedCalendars: string[],
  pending: boolean,
  rangeKey: string,
  previousRangeKey: string,
  dispatch: Function,
  calendarRange: { start: Date; end: Date },
  calType?: "temp",
  controllers?: Map<string, AbortController>
) => {
  if (pending || !rangeKey) return;

  const newCalendars = selectedCalendars.filter(
    (id) => !previousSelectedCalendars.includes(id)
  );

  newCalendars.forEach((id) => {
    if (controllers) {
      const controller = new AbortController();
      controllers.set(id, controller);

      dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
          calType,
          signal: controller.signal,
        })
      );
    } else {
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

  if (rangeKey !== previousRangeKey) {
    selectedCalendars?.forEach((id) => {
      if (id) {
        if (controllers) {
          const controller = new AbortController();
          controllers.set(id, controller);

          dispatch(
            getCalendarDetailAsync({
              calId: id,
              match: {
                start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
                end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
              },
              calType,
              signal: controller.signal,
            })
          );
        } else {
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
