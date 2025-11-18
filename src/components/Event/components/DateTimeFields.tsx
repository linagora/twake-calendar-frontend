import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { LONG_DATE_FORMAT } from "../utils/dateTimeFormatters";
import "dayjs/locale/fr";
import "dayjs/locale/en";
import "dayjs/locale/ru";
import "dayjs/locale/vi";

import { PickerValue } from "@mui/x-date-pickers/internals";

dayjs.extend(customParseFormat);

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
  onEndDateChange: (date: string) => void;
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
  const isExpanded = showMore;
  const shouldShowEndDateNormal = allday || !!showEndDate;
  const shouldShowFullFieldsInNormal = !allday && hasEndDateChanged;
  const showSingleDateField =
    !isExpanded && !shouldShowEndDateNormal && !shouldShowFullFieldsInNormal;
  const startDateLabel = showSingleDateField
    ? t("dateTimeFields.date")
    : t("dateTimeFields.startDate");

  const toDateTime = (date: string, time: string) =>
    dayjs(`${date} ${time || "00:00"}`, "YYYY-MM-DD HH:mm");

  const splitDate = (dt: Dayjs) => dt.format("YYYY-MM-DD");
  const splitTime = (dt: Dayjs) => dt.format("HH:mm");

  const getDuration = (prevStart: Dayjs, prevEnd: Dayjs, isAllDay: boolean) => {
    if (isAllDay) {
      const s = prevStart.startOf("day");
      const e = prevEnd.startOf("day");
      return Math.max(e.diff(s, "day"), 0);
    }
    return Math.max(prevEnd.diff(prevStart, "minute"), 0);
  };

  const enforceDurationAfterStartChange = (params: {
    newStart: Dayjs;
    prevStart: Dayjs;
    prevEnd: Dayjs;
  }) => {
    const { newStart, prevStart, prevEnd } = params;
    const duration = getDuration(prevStart, prevEnd, allday);

    if (allday) {
      const newStartDay = newStart.startOf("day");
      const prevEndDay = prevEnd.startOf("day");

      if (newStartDay.isAfter(prevEndDay)) {
        const fixedEnd = newStartDay.add(duration, "day");
        onEndDateChange(splitDate(fixedEnd));
      }
    } else {
      if (newStart.isAfter(prevEnd)) {
        const fixedEnd = newStart.add(duration, "minute");
        onEndDateChange(splitDate(fixedEnd));
        onEndTimeChange(splitTime(fixedEnd));
      }
    }
  };

  const enforceDurationAfterEndChange = (params: {
    newEnd: Dayjs;
    prevStart: Dayjs;
    prevEnd: Dayjs;
  }) => {
    const { newEnd, prevStart, prevEnd } = params;
    const duration = getDuration(prevStart, prevEnd, allday);

    if (allday) {
      const newEndDay = newEnd.startOf("day");
      const prevStartDay = prevStart.startOf("day");

      if (newEndDay.isBefore(prevStartDay)) {
        const fixedStart = newEndDay.subtract(duration, "day");
        onStartDateChange(splitDate(fixedStart));
      }
    } else {
      if (newEnd.isBefore(prevStart)) {
        const fixedStart = newEnd.subtract(duration, "minute");
        onStartDateChange(splitDate(fixedStart));
        onStartTimeChange(splitTime(fixedStart));
      }
    }
  };

  const handleStartDateChange = (newDateValue: PickerValue) => {
    console.log("startdate", newDateValue);
    if (!newDateValue?.isValid()) return;
    const newDateStr = newDateValue.format("YYYY-MM-DD");

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onStartDateChange(newDateStr);

    const newStart = toDateTime(newDateStr, startTime);
    enforceDurationAfterStartChange({ newStart, prevStart, prevEnd });
  };

  const handleStartTimeChange = (newTimeValue: PickerValue) => {
    if (!newTimeValue?.isValid()) return;
    const newTimeStr = newTimeValue.format("HH:mm");

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onStartTimeChange(newTimeStr);

    const newStart = toDateTime(startDate, newTimeStr);
    enforceDurationAfterStartChange({ newStart, prevStart, prevEnd });
  };

  const handleEndDateChange = (newDateValue: PickerValue) => {
    console.log("endate", newDateValue);
    if (!newDateValue?.isValid()) return;
    const newDateStr = newDateValue.format("YYYY-MM-DD");

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onEndDateChange(newDateStr);

    const newEnd = toDateTime(newDateStr, endTime);
    enforceDurationAfterEndChange({ newEnd, prevStart, prevEnd });
  };

  const handleEndTimeChange = (newTimeValue: PickerValue) => {
    if (!newTimeValue?.isValid()) return;
    const newTimeStr = newTimeValue.format("HH:mm");

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onEndTimeChange(newTimeStr);

    const newEnd = toDateTime(endDate, newTimeStr);
    enforceDurationAfterEndChange({ newEnd, prevStart, prevEnd });
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

  const getSlotProps = (testId: string, hasError = false) => ({
    textField: {
      size: "small" as const,
      margin: "dense" as const,
      fullWidth: true,
      InputLabelProps: { shrink: true },
      error: hasError,
      sx: { width: "100%" },
      inputProps: { "data-testid": testId },
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
        sx={{ maxWidth: showMore ? "calc(100% - 145px)" : "100%" }}
      >
        {isExpanded || shouldShowFullFieldsInNormal ? (
          <>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "300px", width: "48%" }}>
                <DatePicker
                  label={t("dateTimeFields.startDate")}
                  format={LONG_DATE_FORMAT}
                  value={startDateValue}
                  onChange={handleStartDateChange}
                  slotProps={getSlotProps("start-date-input")}
                />
              </Box>
              {!allday && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    label={t("dateTimeFields.startTime")}
                    ampm={false}
                    value={startTimeValue}
                    onChange={handleStartTimeChange}
                    slotProps={getSlotProps("start-time-input")}
                  />
                </Box>
              )}
            </Box>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "300px", width: "48%" }}>
                <DatePicker
                  label={t("dateTimeFields.endDate")}
                  format={LONG_DATE_FORMAT}
                  value={endDateValue}
                  onChange={handleEndDateChange}
                  slotProps={getSlotProps(
                    "end-date-input",
                    !!validation.errors.dateTime
                  )}
                />
              </Box>
              {!allday && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    label={t("dateTimeFields.endTime")}
                    ampm={false}
                    value={endTimeValue}
                    onChange={handleEndTimeChange}
                    slotProps={getSlotProps(
                      "end-time-input",
                      !!validation.errors.dateTime
                    )}
                  />
                </Box>
              )}
            </Box>
          </>
        ) : shouldShowEndDateNormal ? (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={t("dateTimeFields.startDate")}
                format={LONG_DATE_FORMAT}
                value={startDateValue}
                onChange={handleStartDateChange}
                slotProps={getSlotProps("start-date-input")}
              />
            </Box>
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={t("dateTimeFields.endDate")}
                format={LONG_DATE_FORMAT}
                value={endDateValue}
                onChange={handleEndDateChange}
                slotProps={getSlotProps(
                  "end-date-input",
                  !!validation.errors.dateTime
                )}
              />
            </Box>
          </Box>
        ) : (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={startDateLabel}
                format={LONG_DATE_FORMAT}
                value={startDateValue}
                onChange={handleStartDateChange}
                slotProps={getSlotProps("start-date-input")}
              />
            </Box>
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                label={t("dateTimeFields.startTime")}
                ampm={false}
                value={startTimeValue}
                onChange={handleStartTimeChange}
                disabled={allday}
                slotProps={getSlotProps("start-time-input")}
              />
            </Box>
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                label={t("dateTimeFields.endTime")}
                ampm={false}
                value={endTimeValue}
                onChange={handleEndTimeChange}
                disabled={allday}
                slotProps={{
                  textField: {
                    size: "small",
                    margin: "dense" as const,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                    error: !!validation.errors.dateTime,
                    sx: { width: "100%" },
                    inputProps: { "data-testid": "end-time-input" },
                  },
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
