import React from "react";
import { Box, TextField, Typography } from "@mui/material";

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
  validation,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
}) => {
  return (
    <Box display="flex" gap={1} flexDirection="column">
      {/* First row: 4 fields */}
      <Box display="flex" gap={1} flexDirection="row" alignItems="flex-start">
        {/* Start Date - 30% */}
        <Box sx={{ flexGrow: 0.3, flexBasis: "30%" }}>
          {showMore && (
            <Typography variant="caption" display="block" mb={0.5}>
              Start Date
            </Typography>
          )}
          <TextField
            fullWidth
            label={!showMore ? "Start Date" : ""}
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Start Time - 20% */}
        <Box sx={{ flexGrow: 0.2, flexBasis: "20%" }}>
          {showMore && (
            <Typography variant="caption" display="block" mb={0.5}>
              Start Time
            </Typography>
          )}
          <TextField
            fullWidth
            label={!showMore ? "Start Time" : ""}
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={allday}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* End Time - 20% */}
        <Box sx={{ flexGrow: 0.2, flexBasis: "20%" }}>
          {showMore && (
            <Typography variant="caption" display="block" mb={0.5}>
              End Time
            </Typography>
          )}
          <TextField
            fullWidth
            label={!showMore ? "End Time" : ""}
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={allday}
            error={!!validation.errors.dateTime}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* End Date - 30% */}
        <Box sx={{ flexGrow: 0.3, flexBasis: "30%" }}>
          {showMore && (
            <Typography variant="caption" display="block" mb={0.5}>
              End Date
            </Typography>
          )}
          <TextField
            fullWidth
            label={!showMore ? "End Date" : ""}
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            error={!!validation.errors.dateTime}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {/* Second row: Error message - 2 columns 50% each */}
      {validation.errors.dateTime && (
        <Box display="flex" gap={1} flexDirection="row">
          {/* Empty left column - 50% */}
          <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }} />

          {/* Error message right column - 50% */}
          <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }}>
            <Typography variant="caption" color="error">
              {validation.errors.dateTime}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
