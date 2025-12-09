import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { DateCalendar } from "@mui/x-date-pickers";
import moment from "moment";
import {
  computeStartOfTheWeek,
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { getCalendarDetailAsync } from "../../features/Calendars/CalendarSlice";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { setView } from "../../features/Settings/SettingsSlice";

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
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars);
  const [visibleDate, setVisibleDate] = useState(selectedDate);
  const { t } = useI18n();

  useEffect(() => setVisibleDate(selectedDate), [selectedDate]);
  return (
    <LocalizationProvider
      dateAdapter={AdapterMoment}
      adapterLocale={t("locale") ?? "en-gb"}
    >
      <DateCalendar
        value={moment(visibleDate)}
        onChange={async (dateMoment, selectionState) => {
          if (!dateMoment) return;
          const date = dateMoment.toDate();
          if (selectionState === "finish") {
            await dispatch(setView("calendar"));
            setSelectedMiniDate(date);
            calendarRef.current?.gotoDate(date);
          }
        }}
        showDaysOutsideCurrentMonth
        onMonthChange={(month) => {
          const calendarRange = getCalendarRange(month.toDate());
          setVisibleDate(month.toDate());
          Object.values(calendars.list || {}).forEach((cal) =>
            dispatch(
              getCalendarDetailAsync({
                calId: cal.id,
                match: {
                  start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
                  end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
                },
              })
            )
          );
        }}
        views={["month", "day"]}
        sx={{ width: "100%" }}
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

            const classNames = [
              isToday ? "today" : "",
              isSelectedDay ? "selectedDay" : "",
              isInSelectedWeek ? "selectedWeek" : "",
              hasEvents ? "event-dot" : "",
            ].join(" ");

            return {
              className: classNames,
              selected: classNames.includes("selectedWeek"),
              outsideCurrentMonth: ownerState.isDayOutsideMonth,
              disableMargin: false,
              style: {
                backgroundColor: "transparent",
                position: "relative",
                flexDirection: "column",
                border: 0,
              },
              sx: {
                "&.Mui-selected": {
                  color: "inherit !important",
                  fontWeight: "inherit !important",
                },
                "&.selectedDay": {
                  backgroundColor: "lightgray !important",
                },
                "&.today": {
                  background: "orange !important",
                  color: "white !important",
                },
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
