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

export default function CalendarApp() {
  const calendarRef = useRef<CalendarApi | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const tokens = useAppSelector((state) => state.user.tokens);
  const dispatch = useAppDispatch();
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
        userPersonnalCalendars[id].events
      );
    }
  });
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
    Object.keys(calendars).filter((id) => id.split("/")[0] === userId)
  );
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  let filteredEvents: CalendarEvent[] = [];
  selectedCalendars.forEach((id) => {
    filteredEvents = filteredEvents.concat(calendars[id].events);
  });

  useEffect(() => {
    selectedCalendars.forEach((id) => {
      const events = calendars[id]?.events ?? [];

      const isEmpty = events.length === 0;
      const notFetched = !fetchedIdsRef.current.has(id);
      const calendarRange = getCalendarRange(selectedDate);

      if (isEmpty && notFetched && !pending) {
        dispatch(
          getCalendarDetailAsync({
            access_token: tokens.access_token,
            calId: id,
            match: {
              start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
              end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
            },
          })
        );
        fetchedIdsRef.current.add(id);
      }
    });
  }, [selectedCalendars, calendars, pending, tokens.access_token, dispatch]);

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

  return (
    <main>
      <div className="sidebar">
        <div className="calendar-label">
          <div className="calendar-label">
            <span>
              {selectedDate.toLocaleDateString("us-us", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <button
            onClick={() =>
              setSelectedDate(
                new Date(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth() - 1
                )
              )
            }
          >
            &lt;
          </button>
          <button
            onClick={() =>
              setSelectedDate(
                new Date(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth() + 1
                )
              )
            }
          >
            &gt;
          </button>
        </div>
        <ReactCalendar
          key={selectedDate.toDateString()}
          showNeighboringMonth={false}
          calendarType="hebrew"
          formatShortWeekday={(locale, date) =>
            date.toLocaleDateString(locale, { weekday: "narrow" })
          }
          value={selectedDate}
          onClickDay={(date) => {
            setSelectedDate(date);
            calendarRef.current?.gotoDate(date);
          }}
          prevLabel={null}
          nextLabel={null}
          showNavigation={false}
          tileContent={({ date }) => {
            const hasEvents = personnalEvents.some((event) => {
              const eventDate = new Date(event.start);
              return (
                eventDate.getFullYear() === date.getFullYear() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getDate() === date.getDate()
              );
            });
            console.log(date, hasEvents);
            return hasEvents ? <div className="event-dot" /> : null;
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
          weekends={false}
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
          scrollTime={"07:00:00"}
          allDayText=""
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          datesSet={(arg) => {
            const today = new Date();
            setSelectedDate(
              today > arg.start && today < arg.end ? today : arg.start
            );
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
