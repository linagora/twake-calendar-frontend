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
import { dtDate, dtTime, toDateTime } from "../utils/dateTimeHelpers";

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

  const getDuration = (s: Dayjs, e: Dayjs, isAllDay: boolean) =>
    isAllDay
      ? Math.max(e.startOf("day").diff(s.startOf("day"), "day"), 0)
      : Math.max(e.diff(s, "minute"), 0);

  const isEnforcingRef = React.useRef(false);

  const enforceAfterStartChange = (
    newStart: Dayjs,
    prevStart: Dayjs,
    prevEnd: Dayjs
  ) => {
    if (isEnforcingRef.current) return;

    const dur = getDuration(prevStart, prevEnd, allday);

    if (allday) {
      if (newStart.isAfter(prevEnd)) {
        isEnforcingRef.current = true;
        const newEnd = newStart.add(dur, "day");
        onEndDateChange(dtDate(newEnd));
        setTimeout(() => {
          isEnforcingRef.current = false;
        }, 0);
      }
    } else {
      if (newStart.isAfter(prevEnd)) {
        isEnforcingRef.current = true;
        const newEnd = newStart.add(dur, "minute");

        const newEndDate = dtDate(newEnd);
        const newEndTime = dtTime(newEnd);

        if (newEndDate !== endDate) {
          onEndDateChange(newEndDate);
        }
        if (newEndTime !== endTime) {
          onEndTimeChange(newEndTime);
        }

        setTimeout(() => {
          isEnforcingRef.current = false;
        }, 0);
      }
    }
  };

  const enforceAfterEndChange = (
    newEnd: Dayjs,
    prevStart: Dayjs,
    prevEnd: Dayjs
  ) => {
    if (isEnforcingRef.current) return;

    const dur = getDuration(prevStart, prevEnd, allday);

    if (allday) {
      if (newEnd.isBefore(prevStart)) {
        isEnforcingRef.current = true;
        const newStart = newEnd.subtract(dur, "day");
        onStartDateChange(dtDate(newStart));
        setTimeout(() => {
          isEnforcingRef.current = false;
        }, 0);
      }
    } else {
      if (newEnd.isBefore(prevStart)) {
        isEnforcingRef.current = true;
        const newStart = newEnd.subtract(dur, "minute");

        const newStartDate = dtDate(newStart);
        const newStartTime = dtTime(newStart);

        if (newStartDate !== startDate) {
          onStartDateChange(newStartDate);
        }
        if (newStartTime !== startTime) {
          onStartTimeChange(newStartTime);
        }

        setTimeout(() => {
          isEnforcingRef.current = false;
        }, 0);
      }
    }
  };

  const handleStartDateChange = (value: PickerValue) => {
    console.log("date changed : ", value);

    if (!value || !value.isValid() || isEnforcingRef.current) return;

    const newDateStr = dtDate(value as Dayjs);

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onStartDateChange(newDateStr);

    const newStart = toDateTime(newDateStr, startTime);
    enforceAfterStartChange(newStart, prevStart, prevEnd);
  };

  const handleStartTimeChange = (value: PickerValue) => {
    console.log("date changed : ", value);
    if (!value || !value.isValid() || isEnforcingRef.current) return;

    const newTimeStr = dtTime(value as Dayjs);

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onStartTimeChange(newTimeStr);

    const newStart = toDateTime(startDate, newTimeStr);
    enforceAfterStartChange(newStart, prevStart, prevEnd);
  };

  const handleEndDateChange = (value: PickerValue) => {
    if (!value || !value.isValid() || isEnforcingRef.current) return;

    const newDateStr = dtDate(value as Dayjs);

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onEndDateChange(newDateStr);

    const newEnd = toDateTime(newDateStr, endTime);
    enforceAfterEndChange(newEnd, prevStart, prevEnd);
  };

  const handleEndTimeChange = (value: PickerValue) => {
    if (!value || !value.isValid() || isEnforcingRef.current) return;

    const newTimeStr = dtTime(value as Dayjs);

    const prevStart = toDateTime(startDate, startTime);
    const prevEnd = toDateTime(endDate, endTime);

    onEndTimeChange(newTimeStr);

    const newEnd = toDateTime(endDate, newTimeStr);
    enforceAfterEndChange(newEnd, prevStart, prevEnd);
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
