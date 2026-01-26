import { Box, Typography, useTheme } from "@linagora/twake-mui";
import { alpha } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import dayjs from "dayjs";
import React from "react";
import { useI18n } from "twake-i18n";
import { getTimezoneOffset } from "../../Calendar/TimezoneSelector";
import { RepetitionObject } from "@/features/Events/EventsTypes";
import { LONG_DATE_FORMAT } from "../utils/dateTimeFormatters";
import { toDateTime } from "../utils/dateTimeHelpers";

interface DateTimeSummaryProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allday: boolean;
  timezone: string;
  repetition: RepetitionObject;
  showEndDate: boolean;
  onClick: () => void;
}

export const DateTimeSummary: React.FC<DateTimeSummaryProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  allday,
  timezone,
  repetition,
  showEndDate,
  onClick,
}) => {
  const { t, lang } = useI18n();
  const theme = useTheme();

  // Format date: "Wednesday, January 28, 2026"
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = dayjs(dateStr);
    return date.format(LONG_DATE_FORMAT);
  };

  // Format time: "1:00pm - 2:00pm"
  const formatTime = (startTimeStr: string, endTimeStr: string): string => {
    if (allday || !startTimeStr || !endTimeStr) return "";
    
    const format12Hour = (timeStr: string): string => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? "pm" : "am";
      const mins = minutes === 0 ? "" : `:${minutes.toString().padStart(2, "0")}`;
      return `${hour12}${mins}${ampm}`;
    };

    const start = format12Hour(startTimeStr);
    const end = format12Hour(endTimeStr);
    return `${start} - ${end}`;
  };

  // Format timezone: "(UTC+2) Paris"
  const formatTimezone = (tz: string): string => {
    if (!tz) return "";
    try {
      const offset = getTimezoneOffset(tz, new Date());
      const tzName = tz.replace(/_/g, " ");
      return `(${offset}) ${tzName}`;
    } catch (error) {
      return tz.replace(/_/g, " ");
    }
  };

  // Format repeat: "Doesn't repeat" or repeat info
  const formatRepeat = (rep: RepetitionObject): string => {
    if (!rep || !rep.freq) {
      return "Doesn't repeat";
    }

    const interval = rep.interval || 1;
    const freqMap: { [key: string]: string } = {
      daily: t("event.repeat.frequency.days"),
      weekly: t("event.repeat.frequency.weeks"),
      monthly: t("event.repeat.frequency.months"),
      yearly: t("event.repeat.frequency.years"),
    };

    const freqText = freqMap[rep.freq] || rep.freq;
    
    if (interval === 1) {
      return `Every ${freqText}`;
    }
    
    return `Every ${interval} ${freqText}`;
  };

  // Format date text: show both start and end date if showEndDate is true
  const formatDateText = (): string => {
    if (showEndDate && endDate && endDate !== startDate) {
      const startDateText = formatDate(startDate);
      const endDateText = formatDate(endDate);
      return `${startDateText} - ${endDateText}`;
    }
    return formatDate(startDate);
  };

  const dateText = formatDateText();
  const timeText = formatTime(startTime, endTime);
  const timezoneText = formatTimezone(timezone);
  const repeatText = formatRepeat(repetition);

  // Don't render if no date
  if (!startDate) {
    return null;
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        cursor: "pointer",
        padding: 1,
        borderRadius: 1,
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
    >
      <AccessTimeIcon sx={{ color: "text.secondary", mt: 0.5 }} />
      <Box flex={1}>
        <Box display="flex" gap={2} alignItems="center" mb={0.5}>
          <Typography
            variant="body2"
            sx={{ color: alpha(theme.palette.grey[900], 0.9), fontWeight: 500 }}
          >
            {dateText}
          </Typography>
          {timeText && (
            <Typography
              variant="body2"
              sx={{ color: alpha(theme.palette.grey[900], 0.9), fontWeight: 500 }}
            >
              {timeText}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="caption" sx={{ color: "#444746" }}>
            {timezoneText}
          </Typography>
          <Typography variant="caption" sx={{ color: "#444746" }}>
            {repeatText}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
