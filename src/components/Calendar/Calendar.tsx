import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import ReactCalendar from "react-calendar";
import "./Calendar.css";
import { useRef, useState } from "react";
import { useAppSelector } from "../../app/hooks";

export default function CalendarApp() {
  const calendarRef = useRef<CalendarApi | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCalendars, setSelectedCalendars] = useState([
    "Work",
    "Personnal",
  ]);
  const events = useAppSelector((state) => state.events);

  const handleCalendarToggle = (name: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const filteredEvent = events.filter((e) =>
    selectedCalendars.includes(e.calendar)
  );

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
        {["Work", "Personnal", "Holidays"].map((name) => (
          <div key={name}>
            <label>
              <input
                type="checkbox"
                checked={selectedCalendars.includes(name)}
                onChange={() => handleCalendarToggle(name)}
              />
              {name}
            </label>
          </div>
        ))}
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
          nowIndicator
          selectMirror={true}
          views={{
            timeGridWeek: { titleFormat: { month: "long", year: "numeric" } },
          }}
          dayMaxEvents={true}
          events={filteredEvent}
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
      </div>
    </main>
  );
}
