import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import ReactCalendar from "react-calendar";
import "./Calendar.css";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import CalendarPopover from "../../features/Calendars/CalendarModal";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import CalendarSelection from "./CalendarSelection";
import { getCalendarDetailAsync } from "../../features/Calendars/CalendarSlice";
import ImportAlert from "../../features/Events/ImportAlert";
import {
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { push } from "redux-first-history";

export default function CalendarApp() {
  const calendarRef = useRef<CalendarApi | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMiniDate, setSelectedMiniDate] = useState(new Date());
  const tokens = useAppSelector((state) => state.user.tokens);
  const dispatch = useAppDispatch();

  if (!tokens) {
    dispatch(push("/"));
  }

  const calendars = useAppSelector((state) => state.calendars.list);
  const pending = useAppSelector((state) => state.calendars.pending);
  const userId = useAppSelector((state) => state.user.userData.openpaasId);

  const userPersonnalCalendars: Calendars[] = useAppSelector((state) =>
    Object.keys(state.calendars.list).map((id) => {
      if (id.split("/")[0] === userId) {
        return state.calendars.list[id];
      }
      return {} as Calendars;
    })
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
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
    Object.keys(calendars).filter((id) => id.split("/")[0] === userId)
  );

  const calendarRange = getCalendarRange(selectedDate);

  // Create a stable string key for the range
  const rangeKey = `${formatDateToYYYYMMDDTHHMMSS(
    calendarRange.start
  )}_${formatDateToYYYYMMDDTHHMMSS(calendarRange.end)}`;

  let filteredEvents: CalendarEvent[] = [];
  selectedCalendars.forEach((id) => {
    filteredEvents = filteredEvents
      .concat(
        Object.keys(calendars[id].events).map(
          (eventid) => calendars[id].events[eventid]
        )
      )
      .filter((event) => !(event.status === "CANCELLED"));
  });

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
  }, [rangeKey, selectedCalendars]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorElCal, setAnchorElCal] = useState<HTMLElement | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(
    null
  );

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedRange(selectInfo);
    setAnchorEl(document.body); // fallback: we could use selectInfo.jsEvent.target if from a click
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedRange(null);
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
  return (
    <main>
      <div className="sidebar">
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
          calendarType="gregory"
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
              const startOfWeek = new Date(selected);
              startOfWeek.setDate(selected.getDate() - selected.getDay()); // Sunday
              startOfWeek.setHours(0, 0, 0, 0);

              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
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

            return <div className={classNames.join(" ")}></div>;
          }}
        />
        <CalendarSelection
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
        />
        <button onClick={() => setAnchorElCal(document.body)}>+</button>
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
          editable={true}
          selectable={true}
          select={handleDateSelect}
          nowIndicator
          selectMirror={true}
          views={{
            timeGridWeek: { titleFormat: { month: "long", year: "numeric" } },
          }}
          dayMaxEvents={true}
          events={filteredEvents}
          weekNumbers
          weekNumberFormat={{ week: "long" }}
          slotDuration={"00:30:00"}
          slotLabelInterval={"00:30:00"}
          scrollTime={"09:00:00"}
          allDayText=""
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          datesSet={(arg) => {
            if (arg.view.type === "dayGridMonth") {
              setSelectedDate(new Date(arg.start));
              const midTimestamp =
                (arg.start.getTime() + arg.end.getTime()) / 2;
              setSelectedMiniDate(new Date(midTimestamp));
            } else {
              setSelectedDate(new Date(arg.start));
              setSelectedMiniDate(new Date(arg.start));
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
          eventClick={(info) => {
            info.jsEvent.preventDefault(); // don't let the browser navigate

            if (info.event.url) {
              window.open(info.event.url);
            } else {
              console.log(info.event);
            }
          }}
          headerToolbar={{
            left: "title",
            center: "prev,today,next",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
        />
        <EventPopover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClosePopover}
          selectedRange={selectedRange}
        />
        <CalendarPopover
          anchorEl={anchorElCal}
          open={Boolean(anchorElCal)}
          onClose={() => setAnchorElCal(null)}
        />
      </div>
    </main>
  );
}
