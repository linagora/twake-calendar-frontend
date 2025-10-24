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
    dateTimeError = "Start time is required";
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
  // Validate end > start
  else {
    const startDateTime = allday
      ? new Date(startDate + "T00:00:00")
      : new Date(combineDateTime(startDate, startTime));
    const endDateTime = allday
      ? new Date(endDate + "T00:00:00")
      : new Date(combineDateTime(endDate, endTime));

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      isDateTimeValid = false;
      dateTimeError = "Invalid date/time";
    } else if (endDateTime <= startDateTime) {
      isDateTimeValid = false;
      dateTimeError = "End time must be after start time";
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
