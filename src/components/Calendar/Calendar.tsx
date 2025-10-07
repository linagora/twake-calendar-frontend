import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import ReactCalendar from "react-calendar";
import "./Calendar.styl";
import "./CustomCalendar.styl";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import CalendarSelection from "./CalendarSelection";
import { getCalendarDetailAsync } from "../../features/Calendars/CalendarSlice";
import ImportAlert from "../../features/Events/ImportAlert";
import {
  computeStartOfTheWeek,
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { push } from "redux-first-history";
import EventPreviewModal from "../Event/EventDisplayPreview";
import { createSelector } from "@reduxjs/toolkit";
import AddIcon from "@mui/icons-material/Add";
import { TempCalendarsInput } from "./TempCalendarsInput";
import Button from "@mui/material/Button";
import {
  updateSlotLabelVisibility,
  eventToFullCalendarFormat,
  extractEvents,
  updateCalsDetails,
} from "./utils/calendarUtils";
import { useCalendarEventHandlers } from "./hooks/useCalendarEventHandlers";
import { useCalendarViewHandlers } from "./hooks/useCalendarViewHandlers";
import { EditModeDialog } from "../Event/EditModeDialog";

interface CalendarAppProps {
  calendarRef: React.RefObject<CalendarApi | null>;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: string) => void;
}

export default function CalendarApp({
  calendarRef,
  onDateChange,
  onViewChange,
}: CalendarAppProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMiniDate, setSelectedMiniDate] = useState(new Date());
  const tokens = useAppSelector((state) => state.user.tokens);
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!tokens || !userId) {
      dispatch(push("/"));
    }
  }, [tokens, userId]);

  const calendars = useAppSelector((state) => state.calendars.list);
  const tempcalendars =
    useAppSelector((state) => state.calendars.templist) ?? {};
  const pending = useAppSelector((state) => state.calendars.pending);
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
  const fetchedRangesRef = useRef<Record<string, string>>({});

  // Auto-select personal calendars when first loaded
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current && Object.keys(calendars).length > 0 && userId) {
      const personalCalendarIds = Object.keys(calendars).filter(
        (id) => id.split("/")[0] === userId
      );
      setSelectedCalendars(personalCalendarIds);
      initialLoadRef.current = false;
    }
  }, [calendars, userId]);

  const calendarRange = getCalendarRange(selectedDate);
  console.log("start?:", selectedDate);

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
    if (!rangeKey) return;
    selectedCalendars.forEach((id) => {
      if (fetchedRangesRef.current[id] === rangeKey) return;
      fetchedRangesRef.current[id] = rangeKey;
      dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
        })
      );
    });
  }, [
    rangeKey,
    selectedCalendars,
    dispatch,
    calendarRange.start,
    calendarRange.end,
  ]);

  const [prevTempCalendars, setPrevTempCalendars] = useState<string[]>([]);
  const [prevRangeKey, setPrevRangeKey] = useState<string>("");

  useEffect(() => {
    updateCalsDetails(
      Object.keys(tempcalendars),
      prevTempCalendars,
      pending,
      rangeKey,
      prevRangeKey,
      dispatch,
      calendarRange,
      "temp"
    );

    setPrevTempCalendars(Object.keys(tempcalendars));
    setPrevRangeKey(rangeKey);
  }, [rangeKey, Object.keys(tempcalendars).join(","), pending]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [openEventDisplay, setOpenEventDisplay] = useState(false);
  const [eventDisplayedId, setEventDisplayedId] = useState("");
  const [eventDisplayedTemp, setEventDisplayedTemp] = useState(false);
  const [eventDisplayedCalId, setEventDisplayedCalId] = useState("");
  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  );
  const [, setTypeOfAction] = useState<"solo" | "all" | undefined>(undefined);
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<Function>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>(
    {} as CalendarEvent
  );
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(
    null
  );

  const [tempEvent, setTempEvent] = useState<CalendarEvent>(
    {} as CalendarEvent
  );

  // Event handlers
  const eventHandlers = useCalendarEventHandlers({
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    selectedCalendars,
    tempcalendars,
    calendarRange,
    dispatch,
    setOpenEventDisplay,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
  });

  // View handlers
  const viewHandlers = useCalendarViewHandlers({
    calendarRef,
    setSelectedDate,
    setSelectedMiniDate,
    onViewChange,
    calendars,
    tempcalendars,
  });

  const handleMonthUp = () => {
    eventHandlers.handleMonthUp(selectedMiniDate, setSelectedMiniDate);
  };

  const handleMonthDown = () => {
    eventHandlers.handleMonthDown(selectedMiniDate, setSelectedMiniDate);
  };

  if (process.env.NODE_ENV === "test") {
    (window as any).__calendarRef = calendarRef;
  }

  return (
    <main className="main-layout">
      <div className="sidebar">
        <Button
          variant="contained"
          onClick={() =>
            eventHandlers.handleDateSelect(null as unknown as DateSelectArg)
          }
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
                eventDate.getDate() === date.getDate() &&
                event.status !== "CANCELLED"
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
          select={eventHandlers.handleDateSelect}
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
          slotDuration={"00:30:00"}
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
              const start = new Date(arg.start).getTime();
              const end = new Date(arg.end).getTime();
              const middle = start + (end - start) / 2;
              setSelectedDate(new Date(middle));
              console.log(arg);
              setSelectedMiniDate(calendarCurrentDate);
            } else {
              setSelectedDate(new Date(arg.start));
              setSelectedMiniDate(new Date(arg.start));
            }

            // Always use the calendar's current date for consistency
            if (onDateChange) {
              onDateChange(calendarCurrentDate);
            }

            // Notify parent about view change
            if (onViewChange) {
              onViewChange(arg.view.type);
            }

            // Update slot label visibility when view changes
            setTimeout(() => {
              updateSlotLabelVisibility(new Date());
            }, 100);
          }}
          dayHeaderContent={(arg) => {
            const date = arg.date.getDate();
            const weekDay = arg.date
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase();
            return (
              <div className="fc-daygrid-day-top">
                <small>{weekDay}</small>
                {arg.view.type !== "dayGridMonth" && (
                  <span
                    className={`fc-daygrid-day-number ${
                      arg.isToday ? "current-date" : ""
                    }`}
                  >
                    {date}
                  </span>
                )}
              </div>
            );
          }}
          dayHeaderDidMount={viewHandlers.handleDayHeaderDidMount}
          dayHeaderWillUnmount={viewHandlers.handleDayHeaderWillUnmount}
          viewDidMount={viewHandlers.handleViewDidMount}
          viewWillUnmount={viewHandlers.handleViewWillUnmount}
          eventClick={eventHandlers.handleEventClick}
          eventAllow={eventHandlers.handleEventAllow}
          eventDrop={eventHandlers.handleEventDrop}
          eventResize={eventHandlers.handleEventResize}
          eventContent={viewHandlers.handleEventContent}
          eventDidMount={viewHandlers.handleEventDidMount}
        />
        <EventPopover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={eventHandlers.handleClosePopover}
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
          calendarRef={calendarRef}
          event={tempEvent}
        />
        <EditModeDialog
          type={openEditModePopup}
          setOpen={setOpenEditModePopup}
          event={selectedEvent}
          eventAction={(type: "solo" | "all" | undefined) => {
            setTypeOfAction(type);
            afterChoiceFunc && afterChoiceFunc(type);
          }}
        />
        {openEventDisplay && eventDisplayedId && eventDisplayedCalId && (
          <EventPreviewModal
            eventId={eventDisplayedId}
            calId={eventDisplayedCalId}
            tempEvent={eventDisplayedTemp}
            open={openEventDisplay}
            onClose={eventHandlers.handleCloseEventDisplay}
          />
        )}
      </div>
    </main>
  );
}
