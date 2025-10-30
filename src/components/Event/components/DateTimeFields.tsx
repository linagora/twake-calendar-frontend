import React from "react";
import { Box, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment, { Moment } from "moment";
import { LONG_DATE_FORMAT } from "../utils/dateTimeFormatters";

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
  showEndDate,
  onToggleEndDate,
  validation,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
}) => {
  const isExpanded = showMore;
  const shouldShowEndDateNormal = allday || !!showEndDate;
  return (
    <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="en">
      <Box
        display="flex"
        flexDirection="column"
        sx={{ maxWidth: showMore ? "calc(100% - 145px)" : "100%" }}
      >
        {isExpanded ? (
          <>
            <Box display="flex" gap={1} flexDirection="row" alignItems="center">
              <Box sx={{ maxWidth: "280px", width: "45%" }}>
                <DatePicker
                  label="Start Date"
                  format={LONG_DATE_FORMAT}
                  value={startDate ? moment(startDate) : null}
                  onChange={(newValue: Moment | null) => {
                    onStartDateChange(newValue?.format("YYYY-MM-DD") || "");
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
                    label="Start Time"
                    ampm={false}
                    value={startTime ? moment(startTime, "HH:mm") : null}
                    onChange={(newValue: Moment | null) => {
                      onStartTimeChange(newValue?.format("HH:mm") || "");
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
              <Box sx={{ maxWidth: "280px", width: "45%" }}>
                <DatePicker
                  label="End Date"
                  format={LONG_DATE_FORMAT}
                  value={endDate ? moment(endDate) : null}
                  onChange={(newValue: Moment | null) => {
                    onEndDateChange(newValue?.format("YYYY-MM-DD") || "");
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
                    label="End Time"
                    ampm={false}
                    value={endTime ? moment(endTime, "HH:mm") : null}
                    onChange={(newValue: Moment | null) => {
                      onEndTimeChange(newValue?.format("HH:mm") || "");
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
            <Box sx={{ maxWidth: "280px", width: "45%" }}>
              <DatePicker
                label="Start Date"
                format={LONG_DATE_FORMAT}
                value={startDate ? moment(startDate) : null}
                onChange={(newValue: Moment | null) => {
                  onStartDateChange(newValue?.format("YYYY-MM-DD") || "");
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
            <Box sx={{ maxWidth: "280px", width: "45%" }}>
              <DatePicker
                label="End Date"
                format={LONG_DATE_FORMAT}
                value={endDate ? moment(endDate) : null}
                onChange={(newValue: Moment | null) => {
                  onEndDateChange(newValue?.format("YYYY-MM-DD") || "");
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
            <Box sx={{ maxWidth: "280px", width: "45%" }}>
              <DatePicker
                label="Start Date"
                format={LONG_DATE_FORMAT}
                value={startDate ? moment(startDate) : null}
                onChange={(newValue: Moment | null) => {
                  onStartDateChange(newValue?.format("YYYY-MM-DD") || "");
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
                label="Start Time"
                ampm={false}
                value={startTime ? moment(startTime, "HH:mm") : null}
                onChange={(newValue: Moment | null) => {
                  onStartTimeChange(newValue?.format("HH:mm") || "");
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
                label="End Time"
                ampm={false}
                value={endTime ? moment(endTime, "HH:mm") : null}
                onChange={(newValue: Moment | null) => {
                  onEndTimeChange(newValue?.format("HH:mm") || "");
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
            <Box sx={{ width: isExpanded ? "0" : allday ? "45%" : "64%" }} />
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
