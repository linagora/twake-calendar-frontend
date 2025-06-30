import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import ReactCalendar from "react-calendar";
import "./Calendar.css";
import { useRef, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import EventPopover from "../../features/Events/EventModal";
import CalendarPopover from "../../features/Calendars/CalendarModal";

export default function CalendarApp() {
  const calendarRef = useRef<CalendarApi | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const calendars = useAppSelector((state) => state.calendars);
  const [selectedCalendars, setSelectedCalendars] = useState(
    Object.keys(calendars).map((id) => calendars[id].name)
  );
  const events = useAppSelector((state) => state.events);

  const handleCalendarToggle = (name: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const [date, setDate] = useState(new Date());

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

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
              {months[date.getMonth()]} {date.getFullYear()}
            </span>
          </div>
          <button
            onClick={() =>
              setDate(new Date(date.getFullYear(), date.getMonth() - 1))
            }
          >
            &lt;
          </button>
          <button
            onClick={() =>
              setDate(new Date(date.getFullYear(), date.getMonth() + 1))
            }
          >
            &gt;
          </button>
        </div>
        <ReactCalendar
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
        />
        {Object.keys(calendars).map((id) => (
          <div key={id}>
            <label>
              <input
                type="checkbox"
                style={{backgroundColor:calendars[id].color}}
                checked={selectedCalendars.includes(calendars[id].name)}
                onChange={() => handleCalendarToggle(calendars[id].name)}
              />
              {calendars[id].name}
            </label>
          </div>
        ))}
        <button onClick={() => setAnchorElCal(document.body)}>+</button>
      </div>
      <div className="calendar">
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
          events={events}
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
