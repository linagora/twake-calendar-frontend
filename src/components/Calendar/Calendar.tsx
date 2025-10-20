import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import "./Calendar.styl";
import "./CustomCalendar.styl";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import CalendarSelection from "./CalendarSelection";
import {
  getCalendarDetailAsync,
  setTimeZone,
} from "../../features/Calendars/CalendarSlice";
import ImportAlert from "../../features/Events/ImportAlert";
import {
  computeStartOfTheWeek,
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { push } from "redux-first-history";
import EventPreviewModal from "../../features/Events/EventDisplayPreview";
import { createSelector } from "@reduxjs/toolkit";
import AddIcon from "@mui/icons-material/Add";
import { TempCalendarsInput } from "./TempCalendarsInput";
import Button from "@mui/material/Button";
import { Box } from "@mui/material";
import {
  updateSlotLabelVisibility,
  eventToFullCalendarFormat,
  extractEvents,
  updateCalsDetails,
} from "./utils/calendarUtils";
import { useCalendarEventHandlers } from "./hooks/useCalendarEventHandlers";
import { useCalendarViewHandlers } from "./hooks/useCalendarViewHandlers";
import { EditModeDialog } from "../Event/EditModeDialog";
import { EventErrorHandler } from "../Error/EventErrorHandler";
import { EventErrorSnackbar } from "../Error/ErrorSnackbar";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import { TimezoneSelector } from "./TimezoneSelector";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { DayCalendarSkeleton } from "@mui/x-date-pickers/DayCalendarSkeleton";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import { MiniCalendar } from "./MiniCalendar";

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
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);

  const dottedEvents: CalendarEvent[] = selectedCalendars.flatMap((calId) => {
    const calendar = calendars[calId];
    if (!calendar?.events) return [];
    return Object.values(calendar.events);
  });

  const [currentView, setCurrentView] = useState("timeGridWeek");
  const timezone = useAppSelector((state) => state.calendars.timeZone);

  const fetchedRangesRef = useRef<Record<string, string>>({});

  // Auto-select personal calendars when first loaded
  const initialLoadRef = useRef(true);
  const [eventErrors, setEventErrors] = useState<string[]>([]);
  const errorHandler = useRef(new EventErrorHandler());

  useEffect(() => {
    const handler = errorHandler.current;
    handler.setErrorCallback(setEventErrors);
    return () => handler.setErrorCallback(() => {});
  }, []);

  const handleErrorClose = () => {
    setEventErrors([]);
    errorHandler.current.clearAll();
  };

  useEffect(() => {
    if (initialLoadRef.current && Object.keys(calendars).length > 0 && userId) {
      const personalCalendarIds = Object.keys(calendars).filter(
        (id) => id.split("/")[0] === userId
      );
      setSelectedCalendars(personalCalendarIds);
      initialLoadRef.current = false;
    }
  }, [calendars, userId]);

  useEffect(() => {
    const validCalendarIds = new Set(Object.keys(calendars));
    setSelectedCalendars((prev) =>
      prev.filter((calId) => validCalendarIds.has(calId))
    );
  }, [calendars]);

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

  useEffect(() => {
    selectedCalendars.forEach((calId) => {
      const calendar = calendars[calId];
      if (calendar?.lastCacheCleared) {
        delete fetchedRangesRef.current[calId];

        dispatch(
          getCalendarDetailAsync({
            calId,
            match: {
              start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
              end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
            },
          })
        );

        fetchedRangesRef.current[calId] = rangeKey;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCalendars.map((id) => calendars[id]?.lastCacheCleared).join(","),
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
    errorHandler: errorHandler.current,
  });

  if (process.env.NODE_ENV === "test") {
    (window as any).__calendarRef = calendarRef;
  }

  return (
    <main className="main-layout">
      <Box
        className="sidebar"
        sx={{
          padding: "0 25px 16px",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#fff",
            paddingTop: "16px",
          }}
        >
          <Button
            size="large"
            variant="contained"
            fullWidth
            onClick={() =>
              eventHandlers.handleDateSelect(null as unknown as DateSelectArg)
            }
          >
            <AddIcon /> <p>Create Event</p>
          </Button>
        </Box>

        <MiniCalendar
          calendarRef={calendarRef}
          selectedDate={selectedMiniDate}
          setSelectedDate={setSelectedDate}
          setSelectedMiniDate={setSelectedMiniDate}
          dottedEvents={dottedEvents}
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
      </Box>
      <div className="calendar">
        <ImportAlert />
        <FullCalendar
          ref={(ref) => {
            if (ref) {
              calendarRef.current = ref.getApi();
            }
          }}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            momentTimezonePlugin,
          ]}
          initialView="timeGridWeek"
          firstDay={1}
          editable={true}
          selectable={true}
          timeZone={timezone}
          height={"100%"}
          select={eventHandlers.handleDateSelect}
          nowIndicator
          slotLabelClassNames={(arg) => [
            updateSlotLabelVisibility(new Date(), arg, timezone),
          ]}
          nowIndicatorContent={viewHandlers.handleNowIndicatorContent}
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
          weekNumbers={
            currentView === "timeGridWeek" || currentView === "timeGridDay"
          }
          weekNumberFormat={{ week: "long" }}
          weekNumberContent={(arg) => {
            return (
              <div className="weekSelector">
                <div>{arg.text}</div>
                <TimezoneSelector
                  value={timezone}
                  onChange={(newTimezone: string) =>
                    dispatch(setTimeZone(newTimezone))
                  }
                />
              </div>
            );
          }}
          dayCellContent={(arg) => {
            const month = arg.date.toLocaleDateString("en-US", {
              month: "short",
            });
            if (arg.view.type === "dayGridMonth") {
              return (
                <span
                  className={`fc-daygrid-day-number ${
                    arg.isToday ? "current-date" : ""
                  }`}
                >
                  {arg.dayNumberText === "1" ? month : ""} {arg.dayNumberText}
                </span>
              );
            }
          }}
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
            setCurrentView(arg.view.type);
            // Get the current date from calendar API to ensure consistency
            const calendarCurrentDate =
              calendarRef.current?.getDate() || new Date(arg.start);

            if (arg.view.type === "dayGridMonth") {
              const start = new Date(arg.start).getTime();
              const end = new Date(arg.end).getTime();
              const middle = start + (end - start) / 2;
              setSelectedDate(new Date(middle));
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
        <EventErrorSnackbar messages={eventErrors} onClose={handleErrorClose} />
      </div>
    </main>
  );
}
