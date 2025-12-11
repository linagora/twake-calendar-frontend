import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import "./Calendar.styl";
import "./CustomCalendar.styl";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import CalendarSelection from "./CalendarSelection";
import { getCalendarDetailAsync } from "../../features/Calendars/CalendarSlice";
import ImportAlert from "../../features/Events/ImportAlert";
import {
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { push } from "redux-first-history";
import EventPreviewModal from "../../features/Events/EventDisplayPreview";
import AddIcon from "@mui/icons-material/Add";
import { TempCalendarsInput } from "./TempCalendarsInput";
import Button from "@mui/material/Button";
import { Box } from "@mui/material";
import {
  updateSlotLabelVisibility,
  eventToFullCalendarFormat,
  extractEvents,
} from "./utils/calendarUtils";
import { useCalendarEventHandlers } from "./hooks/useCalendarEventHandlers";
import { useCalendarViewHandlers } from "./hooks/useCalendarViewHandlers";
import { EditModeDialog } from "../Event/EditModeDialog";
import { EventErrorHandler } from "../Error/EventErrorHandler";
import { EventErrorSnackbar } from "../Error/ErrorSnackbar";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import { TimezoneSelector } from "./TimezoneSelector";
import { MiniCalendar } from "./MiniCalendar";
import { User } from "../Attendees/PeopleSearch";
import { useTheme } from "@mui/material/styles";
import { updateDarkColor } from "./utils/calendarColorsUtils";
import { useI18n } from "twake-i18n";
import frLocale from "@fullcalendar/core/locales/fr";
import ruLocale from "@fullcalendar/core/locales/ru";
import viLocale from "@fullcalendar/core/locales/vi";
import SearchResultsPage from "../../features/Search/SearchResultsPage";
import { setTimeZone } from "../../features/Settings/SettingsSlice";
import { browserDefaultTimeZone } from "../../utils/timezone";

const localeMap: Record<string, any> = {
  fr: frLocale,
  ru: ruLocale,
  vi: viLocale,
  en: undefined,
};

interface CalendarAppProps {
  calendarRef: MutableRefObject<CalendarApi | null>;
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
  const theme = useTheme();
  useEffect(() => {
    if (!tokens || !userId) {
      dispatch(push("/"));
    }
  }, [dispatch, tokens, userId]);
  const view = useAppSelector((state) => state.settings.view);
  const userData = useAppSelector((state) => state.user.userData);
  const hideDeclinedEvents = useAppSelector(
    (state) => state.settings.hideDeclinedEvents
  );
  const calendars = useAppSelector((state) => state.calendars.list);
  const tempcalendars = useAppSelector((state) => state.calendars.templist);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);

  const calendarLightSignature = useMemo(() => {
    return Object.values(calendars || {})
      .map((cal) => `${cal.id}:${cal.color?.light ?? ""}`)
      .sort()
      .join("|");
  }, [calendars]);

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

  const dottedEvents: CalendarEvent[] = selectedCalendars.flatMap((calId) => {
    const calendar = calendars[calId];
    if (!calendar?.events) return [];
    return Object.values(calendar.events);
  });

  const [currentView, setCurrentView] = useState("timeGridWeek");
  const timezone =
    useAppSelector((state) => state.settings.timeZone) ??
    browserDefaultTimeZone;

  const fetchedRangesRef = useRef<Record<string, string>>({});

  // Auto-select personal calendars when first loaded
  const initialLoadRef = useRef(true);
  const [eventErrors, setEventErrors] = useState<string[]>([]);
  const errorHandler = useRef(new EventErrorHandler());

  // useEffect(() => {
  //   if (view === "search") {
  //     document.body.classList.add("dialog-expanded");
  //   } else {
  //     document.body.classList.remove("dialog-expanded");
  //   }
  // }, [view]);

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
          (id) => id.split("/")[0] === userId
        );
        setSelectedCalendars(personalCalendarIds);
      }
      initialLoadRef.current = false;
    }
  }, [calendarIds, calendars, userId]);

  // Save selected cals to cache
  useEffect(() => {
    if (calendarIds.length > 0) {
      localStorage.setItem(
        "selectedCalendars",
        JSON.stringify(selectedCalendars)
      );
    }
  }, [selectedCalendars, calendarIds.length]);

  const prevCalendarLightSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!calendarLightSignature) {
      prevCalendarLightSignature.current = calendarLightSignature;
      return;
    }

    if (prevCalendarLightSignature.current === calendarLightSignature) {
      return;
    }

    prevCalendarLightSignature.current = calendarLightSignature;
    updateDarkColor(calendars || {}, theme, dispatch);
  }, [calendarLightSignature, calendars, theme, dispatch]);

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

  const calendarRange = useMemo(
    () => getCalendarRange(selectedDate),
    [selectedDate]
  );

  const calendarRangeStart = calendarRange.start.getTime();
  const calendarRangeEnd = calendarRange.end.getTime();

  const rangeStart = useMemo(
    () => formatDateToYYYYMMDDTHHMMSS(new Date(calendarRangeStart)),
    [calendarRangeStart]
  );

  const rangeEnd = useMemo(
    () => formatDateToYYYYMMDDTHHMMSS(new Date(calendarRangeEnd)),
    [calendarRangeEnd]
  );

  // Create a stable string key for the range
  const rangeKey = useMemo(
    () => `${rangeStart}_${rangeEnd}`,
    [rangeStart, rangeEnd]
  );

  let filteredEvents: CalendarEvent[] = extractEvents(
    selectedCalendars,
    calendars || {},
    userData?.email,
    hideDeclinedEvents
  );

  const tempCalendarIds = useMemo(
    () => Object.keys(tempcalendars || {}).sort(),
    [tempcalendars]
  );

  let filteredTempEvents: CalendarEvent[] = extractEvents(
    tempCalendarIds,
    tempcalendars || {},
    userData?.email,
    hideDeclinedEvents
  );

  const sortedSelectedCalendars = useMemo(
    () => [...selectedCalendars].sort(),
    [selectedCalendars]
  );

  const prefetchedCalendarsRef = useRef<Record<string, string>>({});
  const tempFetchedRangesRef = useRef<Record<string, string>>({});
  const activeLoadCompletedRef = useRef<boolean>(false);
  const [activeLoadCompleted, setActiveLoadCompleted] =
    useState<boolean>(false);

  useEffect(() => {
    activeLoadCompletedRef.current = false;
    setActiveLoadCompleted(false);
  }, [rangeKey]);

  useEffect(() => {
    if (!rangeKey || sortedSelectedCalendars.length === 0) {
      activeLoadCompletedRef.current = true;
      setActiveLoadCompleted(true);
      return;
    }

    let cancelled = false;
    const ACTIVE_BATCH_SIZE = 5;

    const loadCalendars = async () => {
      try {
        const pendingIds = sortedSelectedCalendars.filter(
          (id) => fetchedRangesRef.current[id] !== rangeKey
        );

        if (pendingIds.length === 0) {
          activeLoadCompletedRef.current = true;
          setActiveLoadCompleted(true);
          return;
        }

        for (
          let i = 0;
          i < pendingIds.length && !cancelled;
          i += ACTIVE_BATCH_SIZE
        ) {
          const chunk = pendingIds.slice(i, i + ACTIVE_BATCH_SIZE);

          chunk.forEach((id) => {
            fetchedRangesRef.current[id] = rangeKey;
            prefetchedCalendarsRef.current[id] = "active";
          });

          const requests = chunk.map(async (id) => {
            try {
              await dispatch(
                getCalendarDetailAsync({
                  calId: id,
                  match: {
                    start: rangeStart,
                    end: rangeEnd,
                  },
                })
              ).unwrap();
            } catch (error) {
              fetchedRangesRef.current[id] = "";
            }
          });

          await Promise.all(requests);
        }
      } finally {
        if (!cancelled) {
          activeLoadCompletedRef.current = true;
          setActiveLoadCompleted(true);
        }
      }
    };

    loadCalendars();

    return () => {
      cancelled = true;
    };
  }, [dispatch, rangeKey, sortedSelectedCalendars, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!rangeKey || !activeLoadCompleted) return;

    const hiddenCalendars = calendarIds
      .filter((id) => !selectedCalendars.includes(id))
      .filter((id) => {
        const prefetched = prefetchedCalendarsRef.current[id];
        return prefetched !== rangeKey && prefetched !== "active";
      });

    if (hiddenCalendars.length === 0) return;

    hiddenCalendars.forEach((id) => {
      prefetchedCalendarsRef.current[id] = rangeKey;
      dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: rangeStart,
            end: rangeEnd,
          },
        })
      )
        .unwrap()
        .catch(() => {
          prefetchedCalendarsRef.current[id] = "";
        });
    });
  }, [
    calendarIdsString,
    selectedCalendars,
    rangeKey,
    dispatch,
    rangeStart,
    rangeEnd,
    activeLoadCompleted,
  ]);

  const calendarsWithClearedCache = useMemo(() => {
    return selectedCalendars
      .map((id) => {
        const cleared = calendars[id]?.lastCacheCleared;
        return cleared ? { id, cleared } : null;
      })
      .filter(Boolean) as { id: string; cleared: number }[];
  }, [selectedCalendars, calendars]);

  const processedCacheClearRef = useRef<Record<string, number>>({});

  useEffect(() => {
    calendarsWithClearedCache.forEach(({ id, cleared }) => {
      if (processedCacheClearRef.current[id] === cleared) {
        return;
      }

      processedCacheClearRef.current[id] = cleared;
      delete fetchedRangesRef.current[id];
      prefetchedCalendarsRef.current[id] = "";

      dispatch(
        getCalendarDetailAsync({
          calId: id,
          match: {
            start: rangeStart,
            end: rangeEnd,
          },
        })
      )
        .unwrap()
        .then(() => {
          fetchedRangesRef.current[id] = rangeKey;
          prefetchedCalendarsRef.current[id] = rangeKey;
        })
        .catch(() => {
          fetchedRangesRef.current[id] = "";
          prefetchedCalendarsRef.current[id] = "";
        });
    });
  }, [calendarsWithClearedCache, dispatch, rangeKey, rangeStart, rangeEnd]);

  const tempCalendarControllersRef = useRef<Map<string, AbortController>>(
    new Map()
  );

  useEffect(() => {
    const currentIds = new Set(tempCalendarIds);
    Object.keys(tempFetchedRangesRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        delete tempFetchedRangesRef.current[id];
      }
    });
  }, [tempCalendarIds]);

  useEffect(() => {
    if (!rangeKey || tempCalendarIds.length === 0) return;

    let cancelled = false;
    const TEMP_BATCH_SIZE = 5;
    const loadTempCalendars = async () => {
      const pendingIds = tempCalendarIds.filter(
        (id) => tempFetchedRangesRef.current[id] !== rangeKey
      );

      if (pendingIds.length === 0) {
        return;
      }

      for (
        let i = 0;
        i < pendingIds.length && !cancelled;
        i += TEMP_BATCH_SIZE
      ) {
        const chunk = pendingIds.slice(i, i + TEMP_BATCH_SIZE);
        chunk.forEach((id) => {
          tempFetchedRangesRef.current[id] = rangeKey;
        });

        const requests = chunk.map(async (id) => {
          try {
            await dispatch(
              getCalendarDetailAsync({
                calId: id,
                match: {
                  start: rangeStart,
                  end: rangeEnd,
                },
                calType: "temp",
              })
            ).unwrap();
          } catch (error) {
            tempFetchedRangesRef.current[id] = "";
          }
        });

        await Promise.all(requests);
      }
    };

    loadTempCalendars();

    return () => {
      cancelled = true;
    };
  }, [dispatch, rangeKey, tempCalendarIds, rangeStart, rangeEnd]);

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
        } catch (err) {
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
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<Function>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>(
    {} as CalendarEvent
  );
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
    (window as any).__calendarRef = calendarRef;
  }

  const { t, lang } = useI18n();

  return (
    <main className="main-layout calendar-layout">
      <Box
        className="sidebar"
        sx={{
          padding: "0 15px 16px 25px",
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
            <AddIcon /> <p>{t("event.createEvent")}</p>
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
          tempUsers={tempUsers}
          setTempUsers={setTempUsers}
          handleToggleEventPreview={() => {
            eventHandlers.handleDateSelect(null as unknown as DateSelectArg);
          }}
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
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
        {view === "calendar" && (
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
            locale={localeMap[lang]}
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
            eventOrder={(a: any, b: any) =>
              a.extendedProps.priority - b.extendedProps.priority
            }
            weekNumbers={
              currentView === "timeGridWeek" || currentView === "timeGridDay"
            }
            weekNumberFormat={{ week: "long" }}
            weekNumberContent={(arg) => {
              return (
                <div className="weekSelector">
                  <div>
                    {t("menubar.views.week")} {arg.num}
                  </div>
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
