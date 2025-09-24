import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import ReactCalendar from "react-calendar";
import "./Calendar.css";
import "./CustomCalendar.css";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import CalendarSelection from "./CalendarSelection";
import {
  getCalendarDetailAsync,
  getEventAsync,
  putEventAsync,
  updateEventLocal,
} from "../../features/Calendars/CalendarSlice";
import ImportAlert from "../../features/Events/ImportAlert";
import {
  computeStartOfTheWeek,
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
  getDeltaInMilliseconds,
} from "../../utils/dateUtils";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { push } from "redux-first-history";
import EventPreviewModal from "../../features/Events/EventDisplayPreview";
import { createSelector } from "@reduxjs/toolkit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LockIcon from "@mui/icons-material/Lock";
import { userAttendee } from "../../features/User/userDataTypes";
import { TempCalendarsInput } from "./TempCalendarsInput";
import Button from "@mui/material/Button";

interface CalendarAppProps {
  calendarRef: React.RefObject<CalendarApi | null>;
  onDateChange?: (date: Date) => void;
}

export default function CalendarApp({
  calendarRef,
  onDateChange,
}: CalendarAppProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMiniDate, setSelectedMiniDate] = useState(new Date());
  const tokens = useAppSelector((state) => state.user.tokens);
  const dispatch = useAppDispatch();

  if (!tokens) {
    dispatch(push("/"));
  }

  const calendars = useAppSelector((state) => state.calendars.list);
  const tempcalendars =
    useAppSelector((state) => state.calendars.templist) ?? {};
  const pending = useAppSelector((state) => state.calendars.pending);
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const selectPersonnalCalendars = createSelector(
    (state) => state.calendars,
    (calendars) =>
      Object.keys(calendars.list).map((id) => {
        if (id.split("/")[0] === userId) {
          return calendars.list[id];
        }
        return {} as Calendars;
      })
  );
  const userPersonnalCalendars: Calendars[] = useAppSelector(
    selectPersonnalCalendars
  );
  let personnalEvents: CalendarEvent[] = [];
  Object.keys(userPersonnalCalendars).forEach((value, id) => {
    if (userPersonnalCalendars[id].events) {
      personnalEvents = personnalEvents.concat(
        Object.keys(userPersonnalCalendars[id].events).map(
          (eventid) => userPersonnalCalendars[id].events[eventid]
        )
      );
    }
  });
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);

  // Auto-select personal calendars when first loaded
  useEffect(() => {
    if (
      Object.keys(calendars).length > 0 &&
      userId &&
      selectedCalendars.length === 0
    ) {
      const personalCalendarIds = Object.keys(calendars).filter(
        (id) => id.split("/")[0] === userId
      );
      setSelectedCalendars(personalCalendarIds);
    }
  }, [calendars, userId, selectedCalendars.length]);

  const calendarRange = getCalendarRange(selectedDate);

  // Create a stable string key for the range
  const rangeKey = `${formatDateToYYYYMMDDTHHMMSS(
    calendarRange.start
  )}_${formatDateToYYYYMMDDTHHMMSS(calendarRange.end)}`;

  let filteredEvents: CalendarEvent[] = extractEvents(
    selectedCalendars,
    calendars
  );

  let filteredTempEvents: CalendarEvent[] = extractEvents(
    Object.keys(tempcalendars),
    tempcalendars
  );

  useEffect(() => {
    selectedCalendars.forEach((id) => {
      if (!pending && rangeKey) {
        dispatch(
          getCalendarDetailAsync({
            calId: id,
            match: {
              start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
              end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
            },
          })
        );
      }
    });
  }, [
    rangeKey,
    selectedCalendars,
    pending,
    dispatch,
    calendarRange.start,
    calendarRange.end,
  ]);

  useEffect(() => {
    updateCalsDetails(
      Object.keys(tempcalendars),
      pending,
      tempcalendars,
      rangeKey,
      dispatch,
      calendarRange,
      "temp"
    );
  }, [rangeKey, Object.keys(tempcalendars).join(",")]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [openEventDisplay, setOpenEventDisplay] = useState(false);
  const [eventDisplayedId, setEventDisplayedId] = useState("");
  const [eventDisplayedTemp, setEventDisplayedTemp] = useState(false);
  const [eventDisplayedCalId, setEventDisplayedCalId] = useState("");
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(
    null
  );

  const [tempEvent, setTempEvent] = useState<CalendarEvent>(
    {} as CalendarEvent
  );

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedRange(selectInfo);
    setAnchorEl(document.body); // fallback: we could use selectInfo.jsEvent.target if from a click
  };

  const handleClosePopover = () => {
    calendarRef.current?.unselect();
    setAnchorEl(null);
    setSelectedRange(null);
    selectedCalendars.forEach((calId) =>
      dispatch(
        getCalendarDetailAsync({
          calId,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
        })
      )
    );
    Object.keys(tempcalendars).forEach((calId) =>
      dispatch(
        getCalendarDetailAsync({
          calId,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
          calType: "temp",
        })
      )
    );
  };
  const handleCloseEventDisplay = () => {
    setAnchorPosition(null);
    setOpenEventDisplay(false);
  };

  const handleMonthUp = () => {
    setSelectedMiniDate(
      new Date(selectedMiniDate.getFullYear(), selectedMiniDate.getMonth() - 1)
    );
  };
  const handleMonthDown = () => {
    setSelectedMiniDate(
      new Date(selectedMiniDate.getFullYear(), selectedMiniDate.getMonth() + 1)
    );
  };

  if (process.env.NODE_ENV === "test") {
    (window as any).__calendarRef = calendarRef;
  }

  return (
    <main className="main-layout">
      <div className="sidebar">
        <Button
          variant="contained"
          onClick={() => handleDateSelect(null as unknown as DateSelectArg)}
        >
          <AddIcon /> <p>Create Event</p>
        </Button>
        <div className="calendar-label">
          <div className="calendar-label">
            <span title="mini calendar month">
              {selectedMiniDate.toLocaleDateString("en-us", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <button onClick={handleMonthUp}>&lt;</button>
          <button onClick={handleMonthDown}>&gt;</button>
        </div>
        <ReactCalendar
          key={selectedMiniDate.toDateString()}
          calendarType="iso8601"
          formatShortWeekday={(locale, date) =>
            date.toLocaleDateString(locale, { weekday: "narrow" })
          }
          value={selectedMiniDate}
          onClickDay={(date) => {
            setSelectedDate(date);
            setSelectedMiniDate(date);
            calendarRef.current?.gotoDate(date);
          }}
          prevLabel={null}
          showNeighboringMonth={true}
          nextLabel={null}
          showNavigation={false}
          tileClassName={({ date }) => {
            const classNames: string[] = [];

            const today = new Date().setHours(0, 0, 0, 0);
            if (date.getTime() === today) {
              classNames.push("today");
            }
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);
            if (
              calendarRef.current?.view.type === "timeGridWeek" ||
              calendarRef.current?.view.type === undefined
            ) {
              const startOfWeek = computeStartOfTheWeek(selected);

              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
              endOfWeek.setHours(23, 59, 59, 999);

              if (date <= endOfWeek && date >= startOfWeek) {
                classNames.push("selectedWeek");
              }
            }
            if (
              calendarRef.current?.view.type === "timeGridDay" &&
              date.getTime() === selected.getTime()
            ) {
              classNames.push("selectedWeek");
            }
            return classNames;
          }}
          tileContent={({ date }) => {
            const classNames: string[] = [];
            const hasEvents = personnalEvents.some((event) => {
              const eventDate = new Date(event.start);
              return (
                eventDate.getFullYear() === date.getFullYear() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getDate() === date.getDate()
              );
            });
            if (hasEvents) {
              classNames.push("event-dot");
            }

            return (
              <div
                className={classNames.join(" ")}
                data-testid={`date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              ></div>
            );
          }}
        />
        <TempCalendarsInput
          setAnchorEl={setAnchorEl}
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
          setTempEvent={setTempEvent}
        />
        <div className="calendarList">
          <CalendarSelection
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
          />
        </div>
      </div>
      <div className="calendar">
        <ImportAlert />
        <FullCalendar
          ref={(ref) => {
            if (ref) {
              calendarRef.current = ref.getApi();
            }
          }}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          firstDay={1}
          editable={true}
          selectable={true}
          timeZone="local"
          height={"100%"}
          select={handleDateSelect}
          nowIndicator
          headerToolbar={false}
          views={{
            timeGridWeek: { titleFormat: { month: "long", year: "numeric" } },
          }}
          dayMaxEvents={true}
          events={eventToFullCalendarFormat(
            filteredEvents,
            filteredTempEvents,
            userId
          )}
          weekNumbers
          weekNumberFormat={{ week: "long" }}
          slotDuration={"01:00:00"}
          slotLabelInterval={"01:00:00"}
          scrollTime="12:00:00"
          unselectAuto={false}
          allDayText=""
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          datesSet={(arg) => {
            // Get the current date from calendar API to ensure consistency
            const calendarCurrentDate =
              calendarRef.current?.getDate() || new Date(arg.start);

            if (arg.view.type === "dayGridMonth") {
              setSelectedDate(new Date(arg.start));
              setSelectedMiniDate(calendarCurrentDate);
            } else {
              setSelectedDate(new Date(arg.start));
              setSelectedMiniDate(new Date(arg.start));
            }

            // Always use the calendar's current date for consistency
            if (onDateChange) {
              onDateChange(calendarCurrentDate);
            }
          }}
          dayHeaderContent={(arg) => {
            const date = arg.date.getDate();
            const weekDay = arg.date
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase();
            return (
              <div className="fc-daygrid-day-top">
                <small>{weekDay}</small>
                <span
                  className={`fc-daygrid-day-number ${
                    arg.isToday ? "current-date" : ""
                  }`}
                >
                  {date}
                </span>
              </div>
            );
          }}
          dayHeaderDidMount={(arg) => {
            // Add click handler to day headers in week view
            if (arg.view.type === "timeGridWeek") {
              const headerEl = arg.el;

              const handleDayHeaderClick = () => {
                // Switch to day view and navigate to the clicked date
                calendarRef.current?.changeView("timeGridDay", arg.date);
                setSelectedDate(new Date(arg.date));
                setSelectedMiniDate(new Date(arg.date));
              };

              headerEl.addEventListener("click", handleDayHeaderClick);

              // Store the handler for cleanup
              (headerEl as any).__dayHeaderClickHandler = handleDayHeaderClick;
            }
          }}
          dayHeaderWillUnmount={(arg) => {
            // Clean up event listeners to prevent memory leaks
            const headerEl = arg.el;
            if ((headerEl as any).__dayHeaderClickHandler) {
              headerEl.removeEventListener(
                "click",
                (headerEl as any).__dayHeaderClickHandler
              );
              delete (headerEl as any).__dayHeaderClickHandler;
            }
          }}
          viewDidMount={(arg) => {
            // Update now indicator arrow with current time
            const updateNowIndicator = () => {
              const nowIndicatorArrow = document.querySelector(
                ".fc-timegrid-now-indicator-arrow"
              ) as HTMLElement;
              if (nowIndicatorArrow) {
                const now = new Date();
                const timeString = now.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                nowIndicatorArrow.setAttribute("data-time", timeString);
              }
            };

            // Update immediately and then every minute
            updateNowIndicator();
            const timeInterval = setInterval(updateNowIndicator, 60000);

            // Watch for now indicator arrow creation and update immediately
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    if (
                      element.classList?.contains(
                        "fc-timegrid-now-indicator-arrow"
                      ) ||
                      element.querySelector?.(
                        ".fc-timegrid-now-indicator-arrow"
                      )
                    ) {
                      setTimeout(updateNowIndicator, 10);
                    }
                  }
                });
              });
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });

            // Store interval and observer for cleanup
            (arg.el as any).__timeInterval = timeInterval;
            (arg.el as any).__timeObserver = observer;

            // Add global hover effect for week and day views
            if (
              arg.view.type === "timeGridWeek" ||
              arg.view.type === "timeGridDay"
            ) {
              const calendarEl = document.querySelector(".fc") as HTMLElement;
              if (calendarEl) {
                const handleMouseMove = (e: MouseEvent) => {
                  // Find the timegrid container
                  const timegridEl =
                    calendarEl.querySelector(".fc-timegrid-body");
                  if (!timegridEl) return;

                  // Check if mouse is over all-day events area (fc-scrollgrid-sync-table)
                  const allDayTable = calendarEl.querySelector(
                    ".fc-scrollgrid-sync-table"
                  );
                  if (allDayTable) {
                    const allDayRect = allDayTable.getBoundingClientRect();
                    if (
                      e.clientY >= allDayRect.top &&
                      e.clientY <= allDayRect.bottom
                    ) {
                      // Mouse is over all-day events area, don't show highlight
                      timegridEl
                        .querySelectorAll(".hour-highlight")
                        .forEach((el: Element) => el.remove());
                      return;
                    }
                  }

                  // Check if mouse is over time slot labels (left side with hours)
                  const target = e.target as HTMLElement;
                  if (target && target.closest(".fc-timegrid-slot-label")) {
                    // Mouse is over time slot labels, don't show highlight
                    timegridEl
                      .querySelectorAll(".hour-highlight")
                      .forEach((el: Element) => el.remove());
                    return;
                  }

                  // Get all day columns
                  const dayColumns =
                    timegridEl.querySelectorAll(".fc-timegrid-col");
                  if (dayColumns.length === 0) return;

                  // Remove previous highlights
                  timegridEl
                    .querySelectorAll(".hour-highlight")
                    .forEach((el: Element) => el.remove());

                  // Find which day column the mouse is over
                  let targetColumn: Element | null = null;
                  for (const column of dayColumns) {
                    const rect = column.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right) {
                      targetColumn = column;
                      break;
                    }
                  }

                  if (targetColumn) {
                    const rect = targetColumn.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const hourHeight = rect.height / 24; // Assuming 24 hours
                    const hourIndex = Math.floor(relativeY / hourHeight);

                    // Only show highlight if mouse is actually over the timegrid area (not all-day events)
                    if (relativeY >= 0 && relativeY <= rect.height) {
                      // Create highlight for the specific hour in the specific day
                      const highlight = document.createElement("div");
                      highlight.className = "hour-highlight";
                      highlight.style.top = `${hourIndex * hourHeight}px`;
                      highlight.style.height = `${hourHeight}px`;

                      (targetColumn as HTMLElement).style.position = "relative";
                      targetColumn.appendChild(highlight);
                    }
                  }
                };

                const handleMouseLeave = () => {
                  // Remove all hour highlights when mouse leaves calendar
                  const timegridEl =
                    calendarEl.querySelector(".fc-timegrid-body");
                  if (timegridEl) {
                    timegridEl
                      .querySelectorAll(".hour-highlight")
                      .forEach((el: Element) => el.remove());
                  }
                };

                calendarEl.addEventListener("mousemove", handleMouseMove);
                calendarEl.addEventListener("mouseleave", handleMouseLeave);

                // Store handlers for cleanup
                (calendarEl as any).__calendarMouseMoveHandler =
                  handleMouseMove;
                (calendarEl as any).__calendarMouseLeaveHandler =
                  handleMouseLeave;
              }
            }
          }}
          viewWillUnmount={(arg) => {
            // Clean up time interval
            if ((arg.el as any).__timeInterval) {
              clearInterval((arg.el as any).__timeInterval);
              delete (arg.el as any).__timeInterval;
            }

            // Clean up observer
            if ((arg.el as any).__timeObserver) {
              (arg.el as any).__timeObserver.disconnect();
              delete (arg.el as any).__timeObserver;
            }

            // Clean up event listeners to prevent memory leaks
            const calendarEl = document.querySelector(".fc") as HTMLElement;
            if (calendarEl) {
              if ((calendarEl as any).__calendarMouseMoveHandler) {
                calendarEl.removeEventListener(
                  "mousemove",
                  (calendarEl as any).__calendarMouseMoveHandler
                );
                delete (calendarEl as any).__calendarMouseMoveHandler;
              }
              if ((calendarEl as any).__calendarMouseLeaveHandler) {
                calendarEl.removeEventListener(
                  "mouseleave",
                  (calendarEl as any).__calendarMouseLeaveHandler
                );
                delete (calendarEl as any).__calendarMouseLeaveHandler;
              }
            }
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault(); // don't let the browser navigate

            if (info.event.url) {
              window.open(info.event.url);
            } else {
              console.log(info.event);
              setOpenEventDisplay(true);
              setAnchorPosition({
                top: info.jsEvent.clientY,
                left: info.jsEvent.clientX,
              });
              setEventDisplayedId(info.event.extendedProps.uid);
              setEventDisplayedCalId(info.event.extendedProps.calId);
              setEventDisplayedTemp(info.event._def.extendedProps.temp);
            }
          }}
          eventAllow={(dropInfo, draggedEvent) => {
            if (
              draggedEvent?.extendedProps.uid &&
              draggedEvent.extendedProps.uid.split("/")[1]
            ) {
              return false;
            }
            return true;
          }}
          eventDrop={(arg) => {
            const event =
              calendars[arg.event._def.extendedProps.calId].events[
                arg.event._def.extendedProps.uid
              ];

            const totalDeltaMs = getDeltaInMilliseconds(arg.delta);

            const originalStart = new Date(event.start);
            const computedNewStart = new Date(
              originalStart.getTime() + totalDeltaMs
            );
            const originalEnd = new Date(event.end ?? "");
            const computedNewEnd = new Date(
              originalEnd.getTime() + totalDeltaMs
            );
            const newEvent = {
              ...event,
              start: computedNewStart,
              end: computedNewEnd,
            } as CalendarEvent;
            dispatch(
              updateEventLocal({ calId: newEvent.calId, event: newEvent })
            );
            dispatch(
              putEventAsync({ cal: calendars[newEvent.calId], newEvent })
            );
          }}
          eventResize={(arg) => {
            const event =
              calendars[arg.event._def.extendedProps.calId].events[
                arg.event._def.extendedProps.uid
              ];
            if (event.uid.split("/")[1]) {
              dispatch(getEventAsync(event));
            }
            const originalStart = new Date(event.start);
            const computedNewStart = new Date(
              originalStart.getTime() + getDeltaInMilliseconds(arg.startDelta)
            );
            const originalEnd = new Date(event.end ?? "");
            const computedNewEnd = new Date(
              originalEnd.getTime() + getDeltaInMilliseconds(arg.endDelta)
            );
            const newEvent = {
              ...event,
              start: computedNewStart,
              end: computedNewEnd,
            } as CalendarEvent;

            dispatch(
              putEventAsync({ cal: calendars[newEvent.calId], newEvent })
            );
          }}
          eventContent={(arg) => {
            const event = arg.event;
            if (
              (!event._def.extendedProps.temp &&
                !calendars[arg.event._def.extendedProps.calId]) ||
              (event._def.extendedProps.temp &&
                !tempcalendars[arg.event._def.extendedProps.calId])
            )
              return;

            const attendees = event._def.extendedProps.attendee || [];
            const isPrivate =
              event._def.extendedProps.class === "PRIVATE" ||
              event._def.extendedProps.class === "CONFIDENTIAL";
            let Icon = null;
            let titleStyle: React.CSSProperties = {};
            const ownerEmails = new Set(
              (event._def.extendedProps.temp ? tempcalendars : calendars)[
                arg.event._def.extendedProps.calId
              ].ownerEmails?.map((email) => email.toLowerCase())
            );

            const delegated = (
              event._def.extendedProps.temp ? tempcalendars : calendars
            )[arg.event._def.extendedProps.calId].delegated;
            const showSpecialDisplay = attendees.filter((att: userAttendee) =>
              ownerEmails.has(att.cal_address.toLowerCase())
            );
            if (!delegated && showSpecialDisplay.length === 0) return null;
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

            return (
              <div style={{ display: "flex", alignItems: "center" }}>
                {isPrivate && (
                  <LockIcon
                    data-testid="lock-icon"
                    fontSize="small"
                    style={{ marginRight: "4px" }}
                  />
                )}
                {Icon && (
                  <Icon fontSize="small" style={{ marginRight: "4px" }} />
                )}
                <span style={titleStyle}>{event.title}</span>
              </div>
            );
          }}
          eventDidMount={(arg) => {
            const attendees = arg.event._def.extendedProps.attendee || [];
            if (!calendars[arg.event._def.extendedProps.calId]) return;
            const ownerEmails = new Set(
              calendars[arg.event._def.extendedProps.calId].ownerEmails?.map(
                (email) => email.toLowerCase()
              )
            );
            const showSpecialDisplay = attendees.filter((att: userAttendee) =>
              ownerEmails.has(att.cal_address.toLowerCase())
            );

            if (!showSpecialDisplay[0]) return;

            // Clear previously applied classes
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
          }}
        />
        <EventPopover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClosePopover}
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
          calendarRef={calendarRef}
          event={tempEvent}
        />
        {openEventDisplay && eventDisplayedId && eventDisplayedCalId && (
          <EventPreviewModal
            eventId={eventDisplayedId}
            calId={eventDisplayedCalId}
            tempEvent={eventDisplayedTemp}
            anchorPosition={anchorPosition}
            open={openEventDisplay}
            onClose={handleCloseEventDisplay}
          />
        )}
      </div>
    </main>
  );
}

function eventToFullCalendarFormat(
  filteredEvents: CalendarEvent[],
  filteredTempEvents: CalendarEvent[],
  userId: string | undefined
) {
  return filteredEvents
    .concat(filteredTempEvents.map((e) => ({ ...e, temp: true })))
    .map((e) => {
      if (e.calId.split("/")[0] === userId) {
        return { ...e, editable: true };
      }
      return { ...e, editable: false };
    });
}

function extractEvents(
  selectedCalendars: string[],
  calendars: Record<string, Calendars>
) {
  let filteredEvents: CalendarEvent[] = [];
  selectedCalendars.forEach((id) => {
    if (calendars[id].events) {
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
}

function updateCalsDetails(
  selectedCalendars: string[],
  pending: boolean,
  calendars: Record<string, Calendars>,
  rangeKey: string,
  dispatch: Function,
  calendarRange: { start: Date; end: Date },
  calType?: "temp"
) {
  selectedCalendars.forEach((id) => {
    if (Object.keys(calendars[id].events).length > 0) {
      return;
    }
    if (!pending && rangeKey) {
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
