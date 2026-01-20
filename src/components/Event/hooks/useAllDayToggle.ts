import React from "react";
import { combineDateTime } from "../utils/dateTimeHelpers";

/**
 * Parameters for all-day toggle hook
 */
export interface AllDayToggleParams {
  allday: boolean;
  start: string;
  end: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setStart: (start: string) => void;
  setEnd: (end: string) => void;
  setAllDay: (allday: boolean) => void;
  onAllDayChange?: (allday: boolean, start: string, end: string) => void;
}

/**
 * Handlers returned by all-day toggle hook
 */
export interface AllDayToggleHandlers {
  originalTimeRef: React.MutableRefObject<{
    start: string;
    end: string;
    endDate?: string;
    fromAllDaySlot?: boolean;
  } | null>;
  handleAllDayToggle: () => void;
}

/**
 * Custom hook for managing all-day toggle logic
 * Handles saving/restoring time values and endDate logic
 */
export function useAllDayToggle(
  params: AllDayToggleParams
): AllDayToggleHandlers {
  const {
    allday,
    start,
    end,
    startDate,
    startTime,
    endDate,
    endTime,
    setStartTime,
    setEndTime,
    setStart,
    setEnd,
    setAllDay,
    onAllDayChange,
  } = params;

  // Store original time before toggling to all-day
  const originalTimeRef = React.useRef<{
    start: string;
    end: string;
    endDate?: string;
    fromAllDaySlot?: boolean;
  } | null>(null);

  const handleAllDayToggle = React.useCallback(() => {
    const newAllDay = !allday;
    let newStart = start;
    let newEnd = end;

    if (!newAllDay) {
      const hasTimeParts = start.includes("T") && end.includes("T");
      if (!hasTimeParts && !startTime && !endTime) {
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        const nextHour = new Date(now);
        nextHour.setMinutes(0);
        nextHour.setHours(now.getHours() + 1);

        const startHours = String(nextHour.getHours()).padStart(2, "0");
        const startMinutes = String(nextHour.getMinutes()).padStart(2, "0");
        const startTimeStr = `${startHours}:${startMinutes}`;

        const endHourDate = new Date(nextHour);
        endHourDate.setHours(endHourDate.getHours() + 1);
        const endHours = String(endHourDate.getHours()).padStart(2, "0");
        const endMinutes = String(endHourDate.getMinutes()).padStart(2, "0");
        const endTimeStr = `${endHours}:${endMinutes}`;

        const startDateOnly = start.split("T")[0] || startDate;
        const endDateOnly = end.split("T")[0] || endDate || startDateOnly;
        newStart = combineDateTime(startDateOnly, startTimeStr);
        newEnd = combineDateTime(endDateOnly, endTimeStr);

        setStartTime(startTimeStr);
        setEndTime(endTimeStr);
      }
    }

    if (!onAllDayChange) {
      setStart(newStart);
      setEnd(newEnd);
      setAllDay(newAllDay);
    } else {
      onAllDayChange(newAllDay, newStart, newEnd);
    }
  }, [
    allday,
    start,
    end,
    startDate,
    startTime,
    endDate,
    endTime,
    setStartTime,
    setEndTime,
    setStart,
    setEnd,
    setAllDay,
    onAllDayChange,
  ]);

  return {
    originalTimeRef,
    handleAllDayToggle,
  };
}
