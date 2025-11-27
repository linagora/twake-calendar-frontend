import { useRef, useState } from "react";
import { Menubar, MenubarProps } from "../Menubar/Menubar";
import CalendarApp from "./Calendar";
import { useAppDispatch } from "../../app/hooks";
import { getCalendarRange } from "../../utils/dateUtils";
import { useAppSelector } from "../../app/hooks";
import { refreshCalendars } from "../Event/utils/eventUtils";
import { ErrorSnackbar } from "../Error/ErrorSnackbar";

import SettingsPage from "../../features/Settings/SettingsPage";
import SearchResultsPage from "../../features/Search/SearchResultsPage";

export default function CalendarLayout() {
  const calendarRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.calendars.error);
  const selectedCalendars = useAppSelector((state) => state.calendars.list);
  const tempcalendars = useAppSelector((state) => state.calendars.templist);
  const view = useAppSelector((state) => state.settings.view);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");

  const handleRefresh = async () => {
    // Get current calendar range
    if (calendarRef.current) {
      const view = calendarRef.current.view;
      const calendarRange = getCalendarRange(view.activeStart);

      // Refresh events for selected calendars
      await refreshCalendars(
        dispatch,
        Object.values(selectedCalendars),
        calendarRange
      );
      if (tempcalendars) {
        await refreshCalendars(
          dispatch,
          Object.values(tempcalendars),
          calendarRange,
          "temp"
        );
      }
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
      {view === "calendar" && (
        <CalendarApp
          calendarRef={calendarRef}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
        />
      )}
      {view === "settings" && <SettingsPage />}
      {view === "search" && <SearchResultsPage />}
      <ErrorSnackbar error={error} type="calendar" />
    </div>
  );
}
