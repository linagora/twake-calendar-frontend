import { useAppDispatch, useAppSelector } from "@/app/hooks";
import EventPopover from "@/features/Events/EventModal";
import EventPreviewModal from "@/features/Events/EventPreview";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import ImportAlert from "@/features/Events/ImportAlert";
import SearchResultsPage from "@/features/Search/SearchResultsPage";
import { setTimeZone } from "@/features/Settings/SettingsSlice";
import { setDisplayedDateAndRange } from "@/utils/CalendarRangeManager";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { setSelectedCalendars as setSelectedCalendarsToStorage } from "@/utils/storage/setSelectedCalendars";
import { useSelectedCalendars } from "@/utils/storage/useSelectedCalendars";
import { browserDefaultTimeZone } from "@/utils/timezone";
import type { EventApi, LocaleInput } from "@fullcalendar/core";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import ruLocale from "@fullcalendar/core/locales/ru";
import viLocale from "@fullcalendar/core/locales/vi";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Box, Button, radius } from "@linagora/twake-mui";
import AddIcon from "@mui/icons-material/Add";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { useCalendarDataLoader } from "../../features/Calendars/useCalendarLoader";
import { User } from "../Attendees/PeopleSearch";
import { EventErrorSnackbar } from "../Error/ErrorSnackbar";
import { EventErrorHandler } from "../Error/EventErrorHandler";
import { EditModeDialog } from "../Event/EditModeDialog";
import { Menubar, MenubarProps } from "../Menubar/Menubar";
import "./Calendar.styl";
import CalendarSelection from "./CalendarSelection";
import "./CustomCalendar.styl";
import { useCalendarEventHandlers } from "./hooks/useCalendarEventHandlers";
import { useCalendarViewHandlers } from "./hooks/useCalendarViewHandlers";
import { MiniCalendar } from "./MiniCalendar";
import { TempCalendarsInput } from "./TempCalendarsInput";
import { TimezoneSelector } from "./TimezoneSelector";
import {
  eventToFullCalendarFormat,
  extractEvents,
  updateSlotLabelVisibility,
} from "./utils/calendarUtils";

const localeMap: Record<string, LocaleInput | undefined> = {
  fr: frLocale,
  ru: ruLocale,
  vi: viLocale,
  en: undefined,
};

interface CalendarAppProps {
  calendarRef: MutableRefObject<CalendarApi | null>;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: string) => void;
  menubarProps?: MenubarProps;
}

export default function CalendarApp({
  calendarRef,
  onDateChange,
  onViewChange,
  menubarProps,
}: CalendarAppProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [debouncedDate, setDebouncedDate] = useState(new Date());
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDate(selectedDate), 300);
    return () => clearTimeout(t);
  }, [selectedDate]);
  const [selectedMiniDate, setSelectedMiniDate] = useState(new Date());
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const dispatch = useAppDispatch();
  const view = useAppSelector((state) => state.settings.view);
  const userData = useAppSelector((state) => state.user.userData);
  const workingDays = useAppSelector(
    (state) => state.settings.businessHours?.daysOfWeek
  );
  const hideWorkingDays = useAppSelector((state) => state.settings.workingDays);

  const hideDeclinedEvents = useAppSelector(
    (state) => state.settings.hideDeclinedEvents
  );
  const hiddenDays = useMemo(() => {
    if (!hideWorkingDays || !workingDays || workingDays.length === 0) return [];
    const validWorkingDays = workingDays.filter((d) => d >= 0 && d <= 6);
    if (validWorkingDays.length === 0) return [];
    return [0, 1, 2, 3, 4, 5, 6].filter((d) => !validWorkingDays.includes(d));
  }, [hideWorkingDays, workingDays]);

  const calendars = useAppSelector((state) => state.calendars.list);
  const isPending = useAppSelector((state) => state.calendars.pending);
  const displayWeekNumbers = useAppSelector(
    (state) => state.settings.displayWeekNumbers
  );
  const tempcalendars = useAppSelector((state) => state.calendars.templist);
  const storedCalendars = useSelectedCalendars();
  const [selectedCalendars, setSelectedCalendars] =
    useState<string[]>(storedCalendars);

  const calendarIdsString = useMemo(
    () =>
      Object.keys(calendars || {})
        .sort()
        .join(","),
    [calendars]
  );
  const calendarIds = useMemo(
    () => (calendarIdsString ? calendarIdsString.split(",") : []),
    [calendarIdsString]
  );

  const [currentView, setCurrentView] = useState("timeGridWeek");
  const timezone =
    useAppSelector((state) => state.settings.timeZone) ??
    browserDefaultTimeZone;

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
    if (initialLoadRef.current && calendarIds.length > 0 && userId) {
      const cached = localStorage.getItem("selectedCalendars");
      if (cached && cached.length > 0) {
        const parsed = JSON.parse(cached) as string[];
        const valid = parsed.filter((id) => calendars[id]);
        setSelectedCalendars(valid);
      } else {
        const personalCalendarIds = calendarIds.filter(
          (id) => extractEventBaseUuid(id) === userId
        );
        setSelectedCalendars(personalCalendarIds);
      }
      initialLoadRef.current = false;
    }
  }, [calendarIds, calendars, userId]);

  // Save selected cals to cache
  useEffect(() => {
    if (calendarIds.length > 0) {
      setSelectedCalendarsToStorage(selectedCalendars);
    }
  }, [selectedCalendars, calendarIds.length]);

  useEffect(() => {
    if (calendarIds.length === 0) return;
    const validCalendarIds = new Set(calendarIds);
    setSelectedCalendars((prev) => {
      const filtered = prev.filter((calId) => validCalendarIds.has(calId));
      if (filtered.length === prev.length) {
        const unchanged = filtered.every((id, index) => id === prev[index]);
        if (unchanged) {
          return prev;
        }
      }
      return filtered;
    });
  }, [calendarIds]);

  const sortedSelectedCalendars = useMemo(
    () => [...selectedCalendars].sort(),
    [selectedCalendars]
  );

  const tempCalendarIdsString = useMemo(
    () =>
      Object.keys(tempcalendars || {})
        .sort()
        .join(","),
    [tempcalendars]
  );
  const tempCalendarIds = useMemo(
    () => (tempCalendarIdsString ? tempCalendarIdsString.split(",") : []),
    [tempCalendarIdsString]
  );

  useCalendarDataLoader({
    selectedDate: debouncedDate,
    currentView,
    selectedCalendars,
    sortedSelectedCalendars,
    calendarIds,
    calendarIdsString,
    tempCalendarIds,
  });

  const filteredEvents: CalendarEvent[] = extractEvents(
    selectedCalendars,
    calendars || {},
    userData?.email,
    hideDeclinedEvents
  );

  const filteredTempEvents: CalendarEvent[] = extractEvents(
    tempCalendarIds,
    tempcalendars || {},
    userData?.email,
    hideDeclinedEvents
  );

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openEventDisplay, setOpenEventDisplay] = useState(false);
  const [eventDisplayedId, setEventDisplayedId] = useState("");
  const [eventDisplayedTemp, setEventDisplayedTemp] = useState(false);
  const [eventDisplayedCalId, setEventDisplayedCalId] = useState("");

  // Listen for eventModalError event to reopen modal on API failure
  useEffect(() => {
    const handleEventModalError = (event: CustomEvent) => {
      if (event.detail?.type === "create") {
        // Reopen create event modal
        setAnchorEl(document.body);
      } else if (event.detail?.type === "update") {
        // Store update modal info to sessionStorage for EventDisplayPreview to pick up
        try {
          sessionStorage.setItem(
            "eventUpdateModalReopen",
            JSON.stringify({
              eventId: event.detail.eventId,
              calId: event.detail.calId,
              typeOfAction: event.detail.typeOfAction,
              timestamp: Date.now(),
            })
          );

          // Open EventDisplayPreview if it's not already open with matching event, so it can pick up the sessionStorage
          if (
            !openEventDisplay ||
            eventDisplayedId !== event.detail.eventId ||
            eventDisplayedCalId !== event.detail.calId
          ) {
            setEventDisplayedId(event.detail.eventId);
            setEventDisplayedCalId(event.detail.calId);
            setEventDisplayedTemp(false);
            setOpenEventDisplay(true);
          } else {
            // If EventDisplayPreview is already open, trigger reopen by dispatching a custom event
            window.dispatchEvent(
              new CustomEvent("eventUpdateModalReopen", {
                detail: {
                  eventId: event.detail.eventId,
                  calId: event.detail.calId,
                  typeOfAction: event.detail.typeOfAction,
                },
              })
            );
          }
        } catch {
          // Ignore sessionStorage errors
        }
      }
    };

    window.addEventListener(
      "eventModalError",
      handleEventModalError as EventListener
    );
    return () => {
      window.removeEventListener(
        "eventModalError",
        handleEventModalError as EventListener
      );
    };
  }, [openEventDisplay, eventDisplayedId, eventDisplayedCalId]);

  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  );
  const [, setTypeOfAction] = useState<"solo" | "all" | undefined>(undefined);
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<
    ((type: "solo" | "all" | undefined) => void) | undefined
  >();
  const [, setSelectedEvent] = useState<CalendarEvent>({} as CalendarEvent);
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(
    null
  );

  const [tempUsers, setTempUsers] = useState<User[]>([]);
  const [tempEvent, setTempEvent] = useState<CalendarEvent>(
    {} as CalendarEvent
  );

  // Event handlers
  const eventHandlers = useCalendarEventHandlers({
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    dispatch,
    setOpenEventDisplay,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    tempUsers,
    setTempEvent,
    timezone,
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
    window.__calendarRef = calendarRef;
  }

  const { t, lang } = useI18n();

  return (
    <main
      className={`main-layout calendar-layout ${menubarProps?.isIframe ? " isInIframe" : ""}`}
    >
      <Box
        className="sidebar"
        sx={{
          paddingTop: 0,
          paddingBottom: 3,
          paddingLeft: 3,
          paddingRight: 2,
          width: "270px",
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#fff",
            paddingTop: menubarProps?.isIframe ? "10px" : 3,
          }}
        >
          <Button
            size="medium"
            variant="contained"
            fullWidth
            onClick={() =>
              eventHandlers.handleDateSelect(null as unknown as DateSelectArg)
            }
            sx={{
              borderRadius: radius.lg,
              fontSize: "16px",
              fontWeight: 500,
              lineHeight: "normal",
            }}
          >
            <AddIcon sx={{ marginRight: 0.5, fontSize: "20px" }} />{" "}
            {t("event.createEvent")}
          </Button>
        </Box>

        <MiniCalendar
          calendarRef={calendarRef}
          selectedDate={selectedMiniDate}
          setSelectedMiniDate={setSelectedMiniDate}
        />
        <Box sx={{ mb: 3, mt: 2 }}>
          <TempCalendarsInput
            tempUsers={tempUsers}
            setTempUsers={setTempUsers}
            handleToggleEventPreview={() => {
              eventHandlers.handleDateSelect(null as unknown as DateSelectArg);
            }}
          />
        </Box>
        <div className="calendarList">
          <CalendarSelection
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
          />
        </div>
      </Box>
      <div className="calendar">
        <ImportAlert />
        {menubarProps?.isIframe && <Menubar {...menubarProps} />}
        {view === "calendar" && (
          <FullCalendar
            key={hiddenDays.join(",")}
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
            locale={localeMap[lang]}
            hiddenDays={hiddenDays}
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
              userId,
              userData?.email,
              isPending,
              calendars
            )}
            eventOrder={(a: EventApi, b: EventApi) =>
              a.extendedProps.priority - b.extendedProps.priority
            }
            weekNumbers={
              currentView === "timeGridWeek" || currentView === "timeGridDay"
            }
            weekNumberFormat={{ week: "long" }}
            weekNumberContent={(arg) => {
              return (
                <div className="weekSelector">
                  {displayWeekNumbers && (
                    <div>
                      {t("menubar.views.week")} {arg.num}
                    </div>
                  )}
                  <TimezoneSelector
                    value={timezone}
                    referenceDate={calendarRef.current?.getDate() ?? new Date()}
                    onChange={(newTimezone: string) =>
                      dispatch(setTimeZone(newTimezone))
                    }
                  />
                </div>
              );
            }}
            dayCellContent={(arg) => {
              const month = arg.date.toLocaleDateString(t("locale"), {
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
              const calendarCurrentDate =
                calendarRef.current?.getDate() || new Date(arg.start);
              setDisplayedDateAndRange(calendarCurrentDate);

              if (arg.view.type === "dayGridMonth") {
                const start = new Date(arg.start).getTime();
                const end = new Date(arg.end).getTime();
                const middle = start + (end - start) / 2;
                setSelectedDate(new Date(middle));
                setSelectedMiniDate(calendarCurrentDate);
              } else {
                setSelectedDate(calendarCurrentDate);
                setSelectedMiniDate(calendarCurrentDate);
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
                .toLocaleDateString(t("locale"), { weekday: "short" })
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
        )}
        {view === "search" && <SearchResultsPage />}
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
          eventAction={(type: "solo" | "all" | undefined) => {
            setTypeOfAction(type);
            if (afterChoiceFunc) {
              afterChoiceFunc(type);
            }
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
