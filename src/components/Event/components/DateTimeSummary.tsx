import { Box, Typography, useTheme } from "@linagora/twake-mui";
import { alpha } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import "dayjs/locale/ru";
import "dayjs/locale/vi";
import React from "react";
import { useI18n } from "twake-i18n";
import { getTimezoneOffset } from "@/utils/timezone";
import { RepetitionObject } from "@/features/Events/EventsTypes";
import { LONG_DATE_FORMAT } from "../utils/dateTimeFormatters";
import { SectionPreviewRow } from "./SectionPreviewRow";

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

  // Format date with current locale. VI: "Thứ 4, 4 Tháng 2, 2026"; FR: "mercredi, 5 février 2026"; RU: first letter capitalized
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = dayjs(dateStr);
    const locale =
      lang && ["en", "vi", "fr", "ru"].includes(lang) ? lang : "en";

    if (locale === "vi") {
      const dow = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const weekdayLabel = dow === 0 ? "Chủ nhật" : `Thứ ${dow + 1}`; // Mon=Thứ 2, Wed=Thứ 4, ...
      const day = date.date();
      const month = date.month() + 1;
      const year = date.year();
      return `${weekdayLabel}, ${day} Tháng ${month}, ${year}`;
    }

    // French: "5 février" (day before month), not "février 5"
    if (locale === "fr") {
      const formatted = date.locale("fr").format("dddd, D MMMM YYYY");
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    const formatted = date.locale(locale).format(LONG_DATE_FORMAT);
    if (locale === "ru") {
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return formatted;
  };

  // Format time in 24h: "03:30 - 16:30"
  const formatTime = (startTimeStr: string, endTimeStr: string): string => {
    if (allday || !startTimeStr || !endTimeStr) return "";

    const toHHmm = (timeStr: string): string => {
      const [h, m] = timeStr.split(":").map((s) => parseInt(s, 10) || 0);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    return `${toHHmm(startTimeStr)} - ${toHHmm(endTimeStr)}`;
  };

  // Format timezone: "(UTC+2) Paris". Use event date for offset (DST correctness).
  const formatTimezone = (tz: string, dateStr?: string): string => {
    if (!tz) return "";
    try {
      const dateForOffset = dateStr ? dayjs(dateStr).toDate() : new Date();
      const offset = getTimezoneOffset(tz, dateForOffset);
      const tzName = tz.replace(/_/g, " ");
      return `(${offset}) ${tzName}`;
    } catch (error) {
      return tz.replace(/_/g, " ");
    }
  };

  // Format repeat: "Doesn't repeat" or repeat info
  const formatRepeat = (rep: RepetitionObject): string => {
    if (!rep || !rep.freq) {
      return t("event.repeat.doesNotRepeat");
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
      return `${t("event.repeat.every")} ${freqText}`;
    }

    return `${t("event.repeat.every")} ${interval} ${freqText}`;
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
  const timezoneText = formatTimezone(timezone, startDate);
  const repeatText = formatRepeat(repetition);

  // Don't render if no date
  if (!startDate) {
    return null;
  }

  const primaryStyle = {
    fontSize: "14px",
    fontWeight: 500,
    color: alpha(theme.palette.grey[900], 0.9),
  };

  return (
    <SectionPreviewRow
      icon={<AccessTimeIcon sx={{ color: "text.secondary" }} />}
      onClick={onClick}
    >
      <Box>
        <Typography component="p" sx={primaryStyle}>
          {dateText}
          {showEndDate && <br />}
          {timeText && (
            <Box component="span" sx={{ ml: showEndDate ? 0 : 2 }}>
              {timeText}
            </Box>
          )}
        </Typography>
        <Box display="flex" gap={2} alignItems="center" mt={0.5}>
          <Typography variant="caption" sx={{ color: "#444746" }}>
            {timezoneText}
          </Typography>
          <Typography variant="caption" sx={{ color: "#444746" }}>
            {repeatText}
          </Typography>
        </Box>
      </Box>
    </SectionPreviewRow>
  );
};
