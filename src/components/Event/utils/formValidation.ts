import { combineDateTime } from "./dateTimeHelpers";

/**
 * Validation parameters for event form
 */
export interface ValidationParams {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allday: boolean;
  showValidationErrors: boolean;
}

/**
 * Validation result for event form
 */
export interface ValidationResult {
  isValid: boolean;
  errors: {
    title: string;
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
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
  } = params;

  const isTitleValid = title.trim().length > 0;
  const shouldShowTitleError = showValidationErrors && !isTitleValid;

  let isDateTimeValid = true;
  let dateTimeError = "";

  // Validate start date
  if (!startDate || startDate.trim() === "") {
    isDateTimeValid = false;
    dateTimeError = "Start date is required";
  }
  // Validate start time (if not all-day)
  else if (!allday && (!startTime || startTime.trim() === "")) {
    isDateTimeValid = false;
    dateTimeError = "Start time and End time is required";
  }
  // Validate end date
  else if (!endDate || endDate.trim() === "") {
    isDateTimeValid = false;
    dateTimeError = "End date is required";
  }
  // Validate end time (if not all-day)
  else if (!allday && (!endTime || endTime.trim() === "")) {
    isDateTimeValid = false;
    dateTimeError = "End time is required";
  }
  // Validate end vs start
  else {
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
        dateTimeError = "End time must be after start time";
      }
    }
  }

  const isValid = isTitleValid && isDateTimeValid;

  return {
    isValid,
    errors: {
      title: shouldShowTitleError ? "Title is required" : "",
      dateTime: showValidationErrors ? dateTimeError : "",
    },
  };
}
