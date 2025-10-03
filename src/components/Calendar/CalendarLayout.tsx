import React, { useRef, useState } from "react";
import { Menubar, MenubarProps } from "../Menubar/Menubar";
import CalendarApp from "./Calendar";
import { useAppDispatch } from "../../app/hooks";
import {
  getCalendarDetailAsync,
  getCalendarsListAsync,
} from "../../features/Calendars/CalendarSlice";
import {
  formatDateToYYYYMMDDTHHMMSS,
  getCalendarRange,
} from "../../utils/dateUtils";
import { useAppSelector } from "../../app/hooks";

export default function CalendarLayout() {
  const calendarRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  const selectedCalendars = useAppSelector((state) => state.calendars.list);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");

  const handleRefresh = async () => {
    await dispatch(getCalendarsListAsync());

    // Get current calendar range
    if (calendarRef.current) {
      const view = calendarRef.current.view;
      const calendarRange = getCalendarRange(view.activeStart);

      // Refresh events for selected calendars
      Object.keys(selectedCalendars).forEach((id) => {
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
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const menubarProps: MenubarProps = {
    calendarRef,
    onRefresh: handleRefresh,
    currentDate,
    onDateChange: handleDateChange,
    currentView,
    onViewChange: handleViewChange,
  };

  return (
    <div className="App">
      <Menubar {...menubarProps} />
      <CalendarApp
        calendarRef={calendarRef}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
      />
    </div>
  );
}
