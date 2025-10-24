import React from "react";
import { combineDateTime } from "../utils/dateTimeHelpers";
import { getRoundedCurrentTime } from "../utils/dateTimeFormatters";

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
  setEndDate: (date: string) => void;
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
    setEndDate,
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

    if (newAllDay) {
      // OFF => ON: Save original time AND original end date
      if (start.includes("T")) {
        originalTimeRef.current = {
          start: startTime,
          end: endTime,
          endDate: endDate, // Save original end date
        };
      }

      // Reset time to empty, keep only date part
      setStartTime("");
      setEndTime("");
      newStart = startDate;
      newEnd = endDate;

      // If same day, extend end to next day
      if (startDate === endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        newEnd = nextDay.toISOString().split("T")[0];
        setEndDate(newEnd); // Update internal endDate state
      }
    } else {
      // ON => OFF: Restore original time AND original end date
      if (originalTimeRef.current) {
        // Check if this came from all-day slot click
        if (originalTimeRef.current.fromAllDaySlot) {
          // From all-day slot: set endDate = startDate, use default time
          const currentTime = getRoundedCurrentTime();
          const hours = String(currentTime.getHours()).padStart(2, "0");
          const minutes = String(currentTime.getMinutes()).padStart(2, "0");
          const timeStr = `${hours}:${minutes}`;

          newStart = combineDateTime(startDate, timeStr);

          // End time = start time + 1 hour
          const endTimeDate = new Date(currentTime);
          endTimeDate.setHours(endTimeDate.getHours() + 1);
          const endHours = String(endTimeDate.getHours()).padStart(2, "0");
          const endMinutes = String(endTimeDate.getMinutes()).padStart(2, "0");
          const endTimeStr = `${endHours}:${endMinutes}`;

          newEnd = combineDateTime(startDate, endTimeStr); // Use startDate as endDate

          // Update internal states
          setStartTime(timeStr);
          setEndTime(endTimeStr);
          setEndDate(startDate); // Set endDate = startDate
        } else {
          // Normal case: restore original time AND original end date
          const restoredEndDate = originalTimeRef.current.endDate || endDate;

          newStart = combineDateTime(startDate, originalTimeRef.current.start);
          newEnd = combineDateTime(
            restoredEndDate,
            originalTimeRef.current.end
          );

          // Update internal states
          setStartTime(originalTimeRef.current.start);
          setEndTime(originalTimeRef.current.end);
          setEndDate(restoredEndDate);
        }

        originalTimeRef.current = null;
      } else {
        // No original time: use rounded current time with 1 hour duration
        const currentTime = getRoundedCurrentTime();
        const hours = String(currentTime.getHours()).padStart(2, "0");
        const minutes = String(currentTime.getMinutes()).padStart(2, "0");
        const timeStr = `${hours}:${minutes}`;

        newStart = combineDateTime(startDate, timeStr);

        // End time = start time + 1 hour (not 30 mins)
        const endTimeDate = new Date(currentTime);
        endTimeDate.setHours(endTimeDate.getHours() + 1);
        const endHours = String(endTimeDate.getHours()).padStart(2, "0");
        const endMinutes = String(endTimeDate.getMinutes()).padStart(2, "0");
        const endTimeStr = `${endHours}:${endMinutes}`;

        newEnd = combineDateTime(endDate, endTimeStr);

        // Update internal states
        setStartTime(timeStr);
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
    setEndDate,
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
