import React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import moment, { Moment } from "moment";

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
  return (
    <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="en">
      <Box
        display="flex"
        gap={1}
        flexDirection="column"
        sx={{ maxWidth: showMore ? "calc(100% - 145px)" : "100%" }}
      >
        {/* First row: 4 fields */}
        <Box display="flex" gap={1} flexDirection="row" alignItems="center">
          {/* Start Date - 30% */}
          <Box sx={{ flexGrow: 0.3, flexBasis: "25%", maxWidth: "150px" }}>
            <DatePicker
              label="Start Date"
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

          {/* Start Time - 20% */}
          <Box sx={{ flexGrow: 0.2, flexBasis: "25%", maxWidth: "150px" }}>
            <TimePicker
              label="Start Time"
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

          {/* End Time - 20% */}
          <Box sx={{ flexGrow: 0.2, flexBasis: "25%", maxWidth: "150px" }}>
            <TimePicker
              label="End Time"
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

          {/* End Date - Conditional rendering */}
          <Box sx={{ flexGrow: 0.3, flexBasis: "25%", maxWidth: "150px" }}>
            {!showEndDate ? (
              // Show "..." button to reveal end date
              <Box
                display="flex"
                justifyContent="flex-start"
                sx={{ mt: showMore ? 0 : 0 }}
              >
                <Tooltip title="Show end date">
                  <IconButton
                    size="small"
                    onClick={onToggleEndDate}
                    aria-label="Show end date"
                  >
                    <MoreHorizIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              // Show End Date picker (no hide button)
              <DatePicker
                label="End Date"
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
            )}
          </Box>
        </Box>

        {/* Second row: Error message - 2 columns 50% each */}
        {validation.errors.dateTime && (
          <Box display="flex" gap={1} flexDirection="row">
            {/* Empty left column - 50% */}
            <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }} />

            {/* Error message right column - 50% */}
            <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }}>
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
