import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import { DayCalendarSkeleton } from "@mui/x-date-pickers/DayCalendarSkeleton";
import moment from "moment";
import { computeStartOfTheWeek } from "../../utils/dateUtils"; // your util

export function MiniCalendar({
  calendarRef,
  selectedDate,
  setSelectedDate,
  setSelectedMiniDate,
  dottedEvents,
}: {
  calendarRef: any;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  setSelectedMiniDate: (d: Date) => void;
  dottedEvents: any[];
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="en-gb">
      <DateCalendar
        value={moment(selectedDate)}
        onChange={(dateMoment) => {
          if (!dateMoment) return;
          const date = dateMoment.toDate();
          setSelectedDate(date);
          setSelectedMiniDate(date);
          calendarRef.current?.gotoDate(date);
        }}
        renderLoading={() => <DayCalendarSkeleton />}
        showDaysOutsideCurrentMonth
        views={["day"]}
        slotProps={{
          day: (ownerState) => {
            const date = ownerState.day.toDate();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);

            const isToday = date.getTime() === today.getTime();
            const isSelectedDay =
              calendarRef.current?.view.type === "timeGridDay" &&
              date.getTime() === selected.getTime();

            const isInSelectedWeek =
              calendarRef.current?.view.type === "timeGridWeek" ||
              calendarRef.current?.view.type === undefined
                ? (() => {
                    const startOfWeek = computeStartOfTheWeek(selected);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);
                    return date >= startOfWeek && date <= endOfWeek;
                  })()
                : false;

            const hasEvents = dottedEvents.some((event) => {
              const eventDate = new Date(event.start);
              return (
                eventDate.getFullYear() === date.getFullYear() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getDate() === date.getDate() &&
                event.status !== "CANCELLED"
              );
            });

            // Combine your Stylus-based classNames dynamically
            const classNames = [
              "MuiPickersDay-root",
              isToday ? "today" : "",
              isSelectedDay || isInSelectedWeek ? "selectedWeek" : "",
              hasEvents ? "event-dot" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return {
              className: classNames,
              selected: isSelectedDay,
              outsideCurrentMonth: ownerState.isDayOutsideMonth,
              disableMargin: false,
              onClick: () => {
                setSelectedDate(date);
                setSelectedMiniDate(date);
                calendarRef.current?.gotoDate(date);
              },
              style: {
                position: "relative",
                backgroundColor: "transparent",
                flexDirection: "column",
                border: 0,
              },
              "data-testid": `date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
              children: (
                <>
                  {ownerState.day.date()}
                  {hasEvents && <div className="event-dot" />}
                </>
              ),
            };
          },
        }}
      />
    </LocalizationProvider>
  );
}
