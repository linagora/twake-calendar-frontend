import { Box, TextFieldProps, Typography } from "@linagora/twake-mui";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  DatePicker,
  DatePickerFieldProps,
} from "@mui/x-date-pickers/DatePicker";
import { PickerValue } from "@mui/x-date-pickers/internals";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  TimePicker,
  TimePickerFieldProps,
} from "@mui/x-date-pickers/TimePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import "dayjs/locale/ru";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useMemo } from "react";
import { useI18n } from "twake-i18n";
import { LONG_DATE_FORMAT } from "../utils/dateTimeFormatters";
import { dtDate, dtTime, toDateTime } from "../utils/dateTimeHelpers";
import { EditableTimeField } from "./EditableTimeField";
import { ReadOnlyDateField } from "./ReadOnlyPickerField";

dayjs.extend(customParseFormat);

const timePickerPopperSx = {
  "& .MuiPaper-root": {
    width: "110px",
    minWidth: "110px",
  },
  "& .MuiMultiSectionDigitalClockSection-item": {
    justifyContent: "flex-start",
    width: "100%",
    textAlign: "left",
  },
};

/**
 * Props for DateTimeFields component
 */
export interface DateTimeFieldsProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allday: boolean;
  showMore: boolean;
  hasEndDateChanged: boolean;
  showEndDate: boolean;
  onToggleEndDate: () => void;
  validation: {
    errors: {
      dateTime: string;
    };
  };
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: string, time?: string) => void;
  onEndTimeChange: (time: string) => void;
}

/**
 * DateTimeFields component - 4 separate date/time input fields
 * Layout: Start Date (30%) | Start Time (20%) | End Time (20%) | End Date (30%)
 */
export const DateTimeFields: React.FC<DateTimeFieldsProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  allday,
  showMore,
  hasEndDateChanged,
  showEndDate,
  onToggleEndDate,
  validation,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
}) => {
  const { t, lang } = useI18n();

  const initialDurationRef = React.useRef<number | null>(null);
  const isUserActionRef = React.useRef(false);

  const getCurrentDuration = React.useCallback((): number => {
    const start = toDateTime(startDate, startTime);
    const end = toDateTime(endDate, endTime);

    if (allday) {
      return Math.max(end.startOf("day").diff(start.startOf("day"), "day"), 0);
    } else {
      return Math.max(end.diff(start, "minute"), 0);
    }
  }, [startDate, startTime, endDate, endTime, allday]);

  React.useEffect(() => {
    if (!isUserActionRef.current && startDate && endDate) {
      initialDurationRef.current = getCurrentDuration();
    }
    queueMicrotask(() => {
      isUserActionRef.current = false;
    });
  }, [startDate, endDate, startTime, endTime, getCurrentDuration]);

  const spansMultipleDays = React.useMemo(() => {
    return startDate !== endDate;
  }, [startDate, endDate]);

  const isExpanded = showMore;
  const shouldShowEndDateNormal = allday || showEndDate;
  // Show full 4 fields when:
  // 1. Non-allday with hasEndDateChanged
  // 2. Multiple days with hasEndDateChanged (supports drag from week/month view grid with allday checked)
  // 3. Multiple days without allday (original behavior)
  const shouldShowFullFieldsInNormal =
    (!allday && hasEndDateChanged) ||
    (hasEndDateChanged && spansMultipleDays) ||
    (spansMultipleDays && !allday);
  const showSingleDateField =
    !isExpanded && !shouldShowEndDateNormal && !shouldShowFullFieldsInNormal;

  // When shouldShowFullFieldsInNormal is true, show time fields even if allday is true
  // This supports the case: drag from week/month view grid with multiple days
  const shouldShowTimeFields = !allday || shouldShowFullFieldsInNormal;

  const startDateLabel = showSingleDateField
    ? t("dateTimeFields.date")
    : t("dateTimeFields.startDate");

  const handleStartDateChange = (value: PickerValue) => {
    if (!value || !value.isValid()) return;

    isUserActionRef.current = true;
    const newDateStr = dtDate(value as Dayjs);
    const duration = initialDurationRef.current ?? getCurrentDuration();

    onStartDateChange(newDateStr);

    // Preserve duration by adjusting end
    const newStart = toDateTime(newDateStr, startTime);
    let newEnd: Dayjs;

    if (allday) {
      newEnd = newStart.add(duration, "day");
    } else {
      newEnd = newStart.add(duration, "minute");
    }

    const newEndDate = dtDate(newEnd);
    const newEndTime = dtTime(newEnd);

    if (newEndDate !== endDate) {
      onEndDateChange(newEndDate);
    }
    if (!allday && newEndTime !== endTime) {
      onEndTimeChange(newEndTime);
    }
  };

  const handleStartTimeChange = (value: PickerValue) => {
    if (!value || !value.isValid()) return;

    isUserActionRef.current = true;
    const newTimeStr = dtTime(value as Dayjs);
    const duration = initialDurationRef.current ?? getCurrentDuration();

    onStartTimeChange(newTimeStr);

    const newStart = toDateTime(startDate, newTimeStr);
    const newEnd = newStart.add(duration, "minute");

    const newEndDate = dtDate(newEnd);
    const newEndTime = dtTime(newEnd);

    if (newEndDate !== endDate && newEndTime !== endTime) {
      onEndDateChange(newEndDate, newEndTime);
    } else {
      if (newEndDate !== endDate) {
        onEndDateChange(newEndDate);
      }
      if (!allday && newEndTime !== endTime) {
        onEndTimeChange(newEndTime);
      }
    }
  };

  const handleEndDateChange = (value: PickerValue) => {
    if (!value || !value.isValid()) return;

    isUserActionRef.current = true;
    const newDateStr = dtDate(value as Dayjs);
    const newEnd = toDateTime(newDateStr, endTime);
    const currentStart = toDateTime(startDate, startTime);

    if (newEnd.isBefore(currentStart)) {
      const duration = initialDurationRef.current ?? getCurrentDuration();
      let newStart: Dayjs;

      if (allday) {
        newStart = newEnd.subtract(duration, "day");
      } else {
        newStart = newEnd.subtract(duration, "minute");
      }

      const newStartDate = dtDate(newStart);
      const newStartTime = dtTime(newStart);

      if (newStartDate !== startDate) {
        onStartDateChange(newStartDate);
      }
      if (!allday && newStartTime !== startTime) {
        onStartTimeChange(newStartTime);
      }
    } else {
      initialDurationRef.current = newEnd.diff(
        currentStart,
        allday ? "day" : "minute"
      );
    }

    onEndDateChange(newDateStr);
  };

  const handleEndTimeChange = (value: PickerValue) => {
    if (!value || !value.isValid()) return;

    isUserActionRef.current = true;
    const newTimeStr = dtTime(value as Dayjs);
    const newEnd = toDateTime(endDate, newTimeStr);
    const currentStart = toDateTime(startDate, startTime);

    // Always update duration ref to reflect current state, even if invalid (end < start)
    // This prevents stale duration from being used when user edits start time
    initialDurationRef.current = newEnd.diff(currentStart, "minute");

    onEndTimeChange(newTimeStr);
  };

  // Memoize parsed date/time values
  const startDateValue = useMemo(
    () => (startDate ? dayjs(startDate) : null),
    [startDate]
  );
  const startTimeValue = useMemo(
    () => (startTime ? dayjs(startTime, "HH:mm") : null),
    [startTime]
  );
  const endDateValue = useMemo(
    () => (endDate ? dayjs(endDate) : null),
    [endDate]
  );
  const endTimeValue = useMemo(
    () => (endTime ? dayjs(endTime, "HH:mm") : null),
    [endTime]
  );

  const getSlotProps = (
    testId: string,
    hasError = false,
    testLabel?: string
  ) => ({
    textField: {
      size: "small" as const,
      margin: "dense" as const,
      fullWidth: true,
      InputLabelProps: { shrink: true },
      error: hasError,
      sx: { width: "100%" },
      inputProps: {
        "data-testid": testId,
        ...(testLabel ? { "aria-label": testLabel } : {}),
      },
    },
  });

  const getFieldSlotProps = (
    testId: string,
    hasError = false,
    testLabel?: string
  ): Partial<DatePickerFieldProps | TimePickerFieldProps> &
    Pick<
      TextFieldProps,
      | "size"
      | "margin"
      | "fullWidth"
      | "InputLabelProps"
      | "error"
      | "sx"
      | "inputProps"
    > => ({
    size: "small" as const,
    margin: "dense" as const,
    fullWidth: true,
    InputLabelProps: { shrink: true },
    error: hasError,
    sx: { width: "100%" },
    inputProps: {
      "data-testid": testId,
      ...(testLabel ? { "aria-label": testLabel } : {}),
    },
  });

  const getTimeFieldSlotProps = (
    testId: string,
    hasError = false,
    testLabel?: string
  ): Partial<TimePickerFieldProps> &
    Pick<
      TextFieldProps,
      | "size"
      | "margin"
      | "fullWidth"
      | "InputLabelProps"
      | "error"
      | "sx"
      | "inputProps"
    > => ({
    size: "small" as const,
    margin: "dense" as const,
    fullWidth: true,
    InputLabelProps: { shrink: true },
    error: hasError,
    sx: { width: "100%" },
    inputProps: {
      "data-testid": testId,
      ...(testLabel ? { "aria-label": testLabel } : {}),
    },
  });

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={lang ?? "en"}
      localeText={{
        okButtonLabel: t("common.ok"),
        cancelButtonLabel: t("common.cancel"),
        todayButtonLabel: t("menubar.today"),
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        className={`date-time-group ${
          isExpanded || shouldShowFullFieldsInNormal ? "show-full-field" : ""
        }`.trim()}
        sx={{ maxWidth: showMore ? "calc(100% - 145px)" : "100%" }}
      >
        {isExpanded || shouldShowFullFieldsInNormal ? (
          <>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "300px", width: "48%" }}>
                <DatePicker
                  format={LONG_DATE_FORMAT}
                  value={startDateValue}
                  onChange={handleStartDateChange}
                  slots={{ field: ReadOnlyDateField }}
                  slotProps={{
                    ...getSlotProps(
                      "start-date-input",
                      false,
                      t("dateTimeFields.startDate")
                    ),
                    field: getFieldSlotProps(
                      "start-date-input",
                      false,
                      t("dateTimeFields.startDate")
                    ),
                  }}
                />
              </Box>
              {shouldShowTimeFields && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    ampm={false}
                    value={startTimeValue}
                    onChange={handleStartTimeChange}
                    thresholdToRenderTimeInASingleColumn={48}
                    timeSteps={{ minutes: 30 }}
                    slots={{
                      field: EditableTimeField,
                      actionBar: () => null,
                    }}
                    slotProps={{
                      openPickerButton: { sx: { display: "none" } },
                      popper: { sx: timePickerPopperSx },
                      field: getTimeFieldSlotProps(
                        "start-time-input",
                        false,
                        t("dateTimeFields.startTime")
                      ),
                    }}
                  />
                </Box>
              )}
            </Box>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "300px", width: "48%" }}>
                <DatePicker
                  format={LONG_DATE_FORMAT}
                  value={endDateValue}
                  onChange={handleEndDateChange}
                  slots={{ field: ReadOnlyDateField }}
                  slotProps={{
                    ...getSlotProps(
                      "end-date-input",
                      !!validation.errors.dateTime,
                      t("dateTimeFields.endDate")
                    ),
                    field: getFieldSlotProps(
                      "end-date-input",
                      !!validation.errors.dateTime,
                      t("dateTimeFields.endDate")
                    ),
                  }}
                />
              </Box>
              {shouldShowTimeFields && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    ampm={false}
                    value={endTimeValue}
                    onChange={handleEndTimeChange}
                    thresholdToRenderTimeInASingleColumn={48}
                    timeSteps={{ minutes: 30 }}
                    slots={{
                      field: EditableTimeField,
                      actionBar: () => null,
                    }}
                    slotProps={{
                      openPickerButton: { sx: { display: "none" } },
                      popper: { sx: timePickerPopperSx },
                      field: getTimeFieldSlotProps(
                        "end-time-input",
                        !!validation.errors.dateTime,
                        t("dateTimeFields.endTime")
                      ),
                    }}
                  />
                </Box>
              )}
            </Box>
          </>
        ) : shouldShowEndDateNormal ? (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                format={LONG_DATE_FORMAT}
                value={startDateValue}
                onChange={handleStartDateChange}
                slots={{ field: ReadOnlyDateField }}
                slotProps={{
                  ...getSlotProps(
                    "start-date-input",
                    false,
                    t("dateTimeFields.startDate")
                  ),
                  field: getFieldSlotProps(
                    "start-date-input",
                    false,
                    t("dateTimeFields.startDate")
                  ),
                }}
              />
            </Box>
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                format={LONG_DATE_FORMAT}
                value={endDateValue}
                onChange={handleEndDateChange}
                slots={{ field: ReadOnlyDateField }}
                slotProps={{
                  ...getSlotProps(
                    "end-date-input",
                    !!validation.errors.dateTime,
                    t("dateTimeFields.endDate")
                  ),
                  field: getFieldSlotProps(
                    "end-date-input",
                    !!validation.errors.dateTime,
                    t("dateTimeFields.endDate")
                  ),
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                format={LONG_DATE_FORMAT}
                value={startDateValue}
                onChange={handleStartDateChange}
                slots={{ field: ReadOnlyDateField }}
                slotProps={{
                  ...getSlotProps("start-date-input", false, startDateLabel),
                  field: getFieldSlotProps(
                    "start-date-input",
                    false,
                    startDateLabel
                  ),
                }}
              />
            </Box>
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                ampm={false}
                value={startTimeValue}
                onChange={handleStartTimeChange}
                disabled={allday}
                thresholdToRenderTimeInASingleColumn={48}
                timeSteps={{ minutes: 30 }}
                slots={{
                  field: EditableTimeField,
                  actionBar: () => null,
                }}
                slotProps={{
                  openPickerButton: { sx: { display: "none" } },
                  popper: { sx: timePickerPopperSx },
                  field: getTimeFieldSlotProps(
                    "start-time-input",
                    false,
                    t("dateTimeFields.startTime")
                  ),
                }}
              />
            </Box>
            {!allday && (
              <Typography
                sx={{
                  alignSelf: "center",
                  mx: 0.5,
                  mt: 0.5,
                }}
              >
                -
              </Typography>
            )}
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                ampm={false}
                value={endTimeValue}
                onChange={handleEndTimeChange}
                disabled={allday}
                thresholdToRenderTimeInASingleColumn={48}
                timeSteps={{ minutes: 30 }}
                slots={{
                  field: EditableTimeField,
                  actionBar: () => null,
                }}
                slotProps={{
                  openPickerButton: { sx: { display: "none" } },
                  popper: { sx: timePickerPopperSx },
                  field: getTimeFieldSlotProps(
                    "end-time-input",
                    !!validation.errors.dateTime,
                    t("dateTimeFields.endTime")
                  ),
                }}
              />
            </Box>
          </Box>
        )}

        {/* Second row: Error message */}
        {validation.errors.dateTime && (
          <Box display="flex" gap={1} flexDirection="row">
            <Box
              sx={{
                width: "1%",
              }}
            />
            <Box>
              <Typography variant="caption" sx={{ color: "error.main" }}>
                {validation.errors.dateTime}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};
