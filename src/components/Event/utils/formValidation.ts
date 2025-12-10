import { combineDateTime } from "./dateTimeHelpers";

/**
 * Validation parameters for event form
 */
export interface ValidationParams {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allday: boolean;
  showValidationErrors: boolean;
  hasEndDateChanged?: boolean;
  showMore?: boolean;
}

/**
 * Validation result for event form
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    dateTime: string;
  };
}

/**
 * Validate event form fields
 * @param params - Validation parameters
 * @returns Validation result with errors
 */
export function validateEventForm(params: ValidationParams): ValidationResult {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
    hasEndDateChanged = false,
    showMore = false,
  } = params;

  let isDateTimeValid = true;
  let dateTimeError = "";

  // Determine which fields are visible based on UI mode
  const showFullFields =
    showMore ||
    allday ||
    hasEndDateChanged ||
    (!showMore && !allday && startDate !== endDate);
  const showTimeOnly = !allday && !showFullFields;

  // Validate start date
  if (!startDate || startDate.trim() === "") {
    isDateTimeValid = false;
    dateTimeError = "Start date is required";
  }
  // Validate start time (if not all-day)
  else if (!allday && (!startTime || startTime.trim() === "")) {
    isDateTimeValid = false;
    dateTimeError = "Start time is required";
  }
  // Validate end fields based on UI mode
  else if (showFullFields) {
    // 4 fields mode: validate both end date and end time
    if (!endDate || endDate.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "End date is required";
    } else if (!allday && (!endTime || endTime.trim() === "")) {
      isDateTimeValid = false;
      dateTimeError = "End time is required";
    } else {
      // Validate total datetime
      if (allday) {
        const toLocalDate = (ymd: string) => {
          const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
          if (!y || !m || !d) return new Date(NaN);
          return new Date(y, m - 1, d);
        };

        const startOnly = toLocalDate(startDate);
        const endOnly = toLocalDate(endDate);

        if (isNaN(startOnly.getTime()) || isNaN(endOnly.getTime())) {
          isDateTimeValid = false;
          dateTimeError = "Invalid date";
        } else if (endOnly < startOnly) {
          isDateTimeValid = false;
          dateTimeError = "End date must be on or after start date";
        }
      } else {
        const startDateTime = new Date(combineDateTime(startDate, startTime));
        const endDateTime = new Date(combineDateTime(endDate, endTime));

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          isDateTimeValid = false;
          dateTimeError = "Invalid date/time";
        } else if (endDateTime <= startDateTime) {
          isDateTimeValid = false;
          dateTimeError = "End date/time must be after start date/time";
        }
      }
    }
  } else if (showTimeOnly) {
    // 3 fields mode: validate time only (end time > start time, same day)
    if (!endTime || endTime.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "End time is required";
    } else {
      // Compare times only (same day is assumed)
      const startTimeParts = startTime.split(":");
      const endTimeParts = endTime.split(":");
      if (startTimeParts.length === 2 && endTimeParts.length === 2) {
        const startMinutes =
          parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
        const endMinutes =
          parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
        if (endMinutes <= startMinutes) {
          isDateTimeValid = false;
          dateTimeError = "End time must be after start time";
        }
      } else {
        isDateTimeValid = false;
        dateTimeError = "Invalid time format";
      }
    }
  }

  const isValid = isDateTimeValid;

  return {
    isValid,
    errors: {
      dateTime: showValidationErrors ? dateTimeError : "",
    },
  };
}
