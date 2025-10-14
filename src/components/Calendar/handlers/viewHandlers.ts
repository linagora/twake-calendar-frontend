import React from "react";
import { CalendarApi, NowIndicatorContentArg } from "@fullcalendar/core";
import { updateSlotLabelVisibility } from "../utils/calendarUtils";
import { createMouseHandlers } from "./mouseHandlers";
import { userAttendee } from "../../../features/User/userDataTypes";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LockIcon from "@mui/icons-material/Lock";
import { EventErrorHandler } from "../../Error/EventErrorHandler";

export interface ViewHandlersProps {
  calendarRef: React.RefObject<CalendarApi | null>;
  setSelectedDate: (date: Date) => void;
  setSelectedMiniDate: (date: Date) => void;
  onViewChange?: (view: string) => void;
  calendars: Record<string, Calendars>;
  tempcalendars: Record<string, Calendars>;
  errorHandler: EventErrorHandler;
}

export const createViewHandlers = (props: ViewHandlersProps) => {
  const {
    calendarRef,
    setSelectedDate,
    setSelectedMiniDate,
    onViewChange,
    calendars,
    tempcalendars,
    errorHandler,
  } = props;

  const handleNowIndicatorContent = (arg: NowIndicatorContentArg) => {
    if (arg.isAxis) {
      return React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center" } },
        React.createElement(
          "div",
          { className: "now-time-label" },
          new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: arg.view.dateEnv.timeZone,
          })
        )
      );
    }
  };

  const handleDayHeaderDidMount = (arg: any) => {
    if (arg.view.type === "timeGridWeek") {
      const headerEl = arg.el;

      const handleDayHeaderClick = () => {
        calendarRef.current?.changeView("timeGridDay", arg.date);
        setSelectedDate(new Date(arg.date));
        setSelectedMiniDate(new Date(arg.date));

        if (onViewChange) {
          onViewChange("timeGridDay");
        }
      };

      headerEl.addEventListener("click", handleDayHeaderClick);
      (headerEl as any).__dayHeaderClickHandler = handleDayHeaderClick;
    }
  };

  const handleDayHeaderWillUnmount = (arg: any) => {
    const headerEl = arg.el;
    if ((headerEl as any).__dayHeaderClickHandler) {
      headerEl.removeEventListener(
        "click",
        (headerEl as any).__dayHeaderClickHandler
      );
      delete (headerEl as any).__dayHeaderClickHandler;
    }
  };

  const handleViewDidMount = (arg: any) => {
    if (arg.view.type === "timeGridWeek" || arg.view.type === "timeGridDay") {
      const calendarEl = document.querySelector(".fc") as HTMLElement;
      if (calendarEl) {
        const mouseHandlers = createMouseHandlers({ calendarEl });
        mouseHandlers.addMouseEventListeners();
      }
    }
  };

  const handleViewWillUnmount = (arg: any) => {
    if ((arg.el as any).__timeInterval) {
      clearInterval((arg.el as any).__timeInterval);
      delete (arg.el as any).__timeInterval;
    }

    if ((arg.el as any).__timeObserver) {
      (arg.el as any).__timeObserver.disconnect();
      delete (arg.el as any).__timeObserver;
    }

    const calendarEl = document.querySelector(".fc") as HTMLElement;
    if (calendarEl) {
      const mouseHandlers = createMouseHandlers({ calendarEl });
      mouseHandlers.removeMouseEventListeners();
    }
  };

  const handleEventContent = (arg: any) => {
    const event = arg.event;
    const props = event._def.extendedProps;
    const {
      calId,
      temp,
      attendee: attendees = [],
      class: classification,
    } = props;
    try {
      const calendarsSource = temp ? tempcalendars : calendars;
      const calendar = calendarsSource[calId];
      if (!calendar) return null;

      const isPrivate = ["PRIVATE", "CONFIDENTIAL"].includes(classification);
      const ownerEmails = new Set(
        calendar.ownerEmails?.map((e) => e.toLowerCase())
      );
      const delegated = calendar.delegated;
      let Icon = null;
      let titleStyle: React.CSSProperties = {};

      const showSpecialDisplay = attendees.filter((att: userAttendee) =>
        ownerEmails.has(att.cal_address.toLowerCase())
      );
      // if no special display
      if (attendees.length && !delegated && !showSpecialDisplay.length) {
        return React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center" } },
          React.createElement("span", null, event.title)
        );
      }
      switch (showSpecialDisplay?.[0]?.partstat) {
        case "DECLINED":
          Icon = null;
          titleStyle.textDecoration = "line-through";
          break;
        case "TENTATIVE":
          Icon = HelpOutlineIcon;
          break;
        case "NEEDS-ACTION":
          Icon = AccessTimeIcon;
          break;
        case "ACCEPTED":
          Icon = null;
          break;
        default:
          break;
      }

      return React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center" } },
        isPrivate &&
          React.createElement(LockIcon, {
            "data-testid": "lock-icon",
            fontSize: "small",
            style: { marginRight: "4px" },
          }),
        Icon &&
          React.createElement(Icon, {
            fontSize: "small",
            style: { marginRight: "4px" },
          }),
        React.createElement("span", { style: titleStyle }, event.title)
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unknown error during rendering";
      errorHandler.reportError(
        event._def.extendedProps.uid || event.id,
        message
      );
      return React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center" } },
        React.createElement("span", null, event.title)
      );
    }
  };

  const handleEventDidMount = (arg: any) => {
    const attendees = arg.event._def.extendedProps.attendee || [];
    if (!calendars[arg.event._def.extendedProps.calId]) return;
    const ownerEmails = new Set(
      calendars[arg.event._def.extendedProps.calId].ownerEmails?.map((email) =>
        email.toLowerCase()
      )
    );
    const showSpecialDisplay = attendees.filter((att: userAttendee) =>
      ownerEmails.has(att.cal_address.toLowerCase())
    );

    if (!showSpecialDisplay[0]) return;

    arg.el.classList.remove(
      "declined-event",
      "tentative-event",
      "needs-action-event"
    );

    switch (showSpecialDisplay[0].partstat) {
      case "DECLINED":
        arg.el.classList.add("declined-event");
        break;
      case "TENTATIVE":
        arg.el.classList.add("tentative-event");
        break;
      case "NEEDS-ACTION":
        arg.el.classList.add("needs-action-event");
        break;
      default:
        break;
    }
  };

  return {
    handleNowIndicatorContent,
    handleDayHeaderDidMount,
    handleDayHeaderWillUnmount,
    handleViewDidMount,
    handleViewWillUnmount,
    handleEventContent,
    handleEventDidMount,
  };
};
