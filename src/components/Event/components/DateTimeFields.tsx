import React from "react";
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
                  value={startDate ? dayjs(startDate) : null}
                  onChange={(newValue) => {
                    const value = newValue as Dayjs | null;
                    if (!value || !value.isValid()) {
                      return;
                    }
                    const formatted = value.format("YYYY-MM-DD");
                    onStartDateChange(formatted);
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      margin: "dense" as const,
                      fullWidth: true,
                      InputLabelProps: { shrink: true },
                      sx: { width: "100%" },
                      inputProps: { "data-testid": "start-date-input" },
                    },
                  }}
                />
              </Box>
              {!allday && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    label={t("dateTimeFields.startTime")}
                    ampm={false}
                    value={startTime ? dayjs(startTime, "HH:mm") : null}
                    onChange={(newValue) => {
                      const value = newValue as Dayjs | null;
                      if (!value || !value.isValid()) {
                        return;
                      }
                      const formatted = value?.format("HH:mm") || "";
                      onStartTimeChange(formatted);
                    }}
                    slotProps={{
                      textField: {
                        size: "small",
                        margin: "dense" as const,
                        fullWidth: true,
                        InputLabelProps: { shrink: true },
                        sx: { width: "100%" },
                        inputProps: { "data-testid": "start-time-input" },
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "300px", width: "48%" }}>
                <DatePicker
                  label={t("dateTimeFields.endDate")}
                  format={LONG_DATE_FORMAT}
                  value={endDate ? dayjs(endDate) : null}
                  onChange={(newValue) => {
                    const value = newValue as Dayjs | null;
                    if (!value || !value.isValid()) {
                      return;
                    }
                    const formatted = value.format("YYYY-MM-DD");
                    onEndDateChange(formatted);
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      margin: "dense" as const,
                      fullWidth: true,
                      InputLabelProps: { shrink: true },
                      error: !!validation.errors.dateTime,
                      sx: { width: "100%" },
                      inputProps: { "data-testid": "end-date-input" },
                    },
                  }}
                />
              </Box>
              {!allday && (
                <Box sx={{ width: "110px" }}>
                  <TimePicker
                    label={t("dateTimeFields.endTime")}
                    ampm={false}
                    value={endTime ? dayjs(endTime, "HH:mm") : null}
                    onChange={(newValue) => {
                      const value = newValue as Dayjs | null;
                      if (!value || !value.isValid()) {
                        return;
                      }
                      const formatted = value?.format("HH:mm") || "";
                      onEndTimeChange(formatted);
                    }}
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
              )}
            </Box>
          </>
        ) : shouldShowEndDateNormal ? (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={t("dateTimeFields.startDate")}
                format={LONG_DATE_FORMAT}
                value={startDate ? dayjs(startDate) : null}
                onChange={(newValue) => {
                  const value = newValue as Dayjs | null;
                  if (!value || !value.isValid()) {
                    return;
                  }
                  const formatted = value.format("YYYY-MM-DD");
                  onStartDateChange(formatted);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    margin: "dense" as const,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                    sx: { width: "100%" },
                    inputProps: { "data-testid": "start-date-input" },
                  },
                }}
              />
            </Box>
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={t("dateTimeFields.endDate")}
                format={LONG_DATE_FORMAT}
                value={endDate ? dayjs(endDate) : null}
                onChange={(newValue) => {
                  const value = newValue as Dayjs | null;
                  if (!value || !value.isValid()) {
                    return;
                  }
                  const formatted = value.format("YYYY-MM-DD");
                  onEndDateChange(formatted);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    margin: "dense" as const,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                    error: !!validation.errors.dateTime,
                    sx: { width: "100%" },
                    inputProps: { "data-testid": "end-date-input" },
                  },
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box display="flex" gap={1} flexDirection="row" alignItems="center">
            <Box sx={{ maxWidth: "300px", width: "48%" }}>
              <DatePicker
                label={startDateLabel}
                format={LONG_DATE_FORMAT}
                value={startDate ? dayjs(startDate) : null}
                onChange={(newValue) => {
                  const value = newValue as Dayjs | null;
                  if (!value || !value.isValid()) {
                    return;
                  }
                  const formatted = value.format("YYYY-MM-DD");
                  onStartDateChange(formatted);
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    margin: "dense" as const,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                    sx: { width: "100%" },
                    inputProps: { "data-testid": "start-date-input" },
                  },
                }}
              />
            </Box>
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                label={t("dateTimeFields.startTime")}
                ampm={false}
                value={startTime ? dayjs(startTime, "HH:mm") : null}
                onChange={(newValue) => {
                  const value = newValue as Dayjs | null;
                  if (!value || !value.isValid()) {
                    return;
                  }
                  const formatted = value?.format("HH:mm") || "";
                  onStartTimeChange(formatted);
                }}
                disabled={allday}
                slotProps={{
                  textField: {
                    size: "small",
                    margin: "dense" as const,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                    sx: { width: "100%" },
                    inputProps: { "data-testid": "start-time-input" },
                  },
                }}
              />
            </Box>
            <Box sx={{ maxWidth: "110px" }}>
              <TimePicker
                label={t("dateTimeFields.endTime")}
                ampm={false}
                value={endTime ? dayjs(endTime, "HH:mm") : null}
                onChange={(newValue) => {
                  const value = newValue as Dayjs | null;
                  if (!value || !value.isValid()) {
                    return;
                  }
                  const formatted = value?.format("HH:mm") || "";
                  onEndTimeChange(formatted);
                }}
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
