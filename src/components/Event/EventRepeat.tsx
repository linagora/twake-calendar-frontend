import { RepetitionObject } from "@/features/Events/EventsTypes";
import {
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@linagora/twake-mui";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { PickerValue } from "@mui/x-date-pickers/internals";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import "dayjs/locale/ru";
import "dayjs/locale/vi";
import React, { useMemo, useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { ReadOnlyDateField } from "./components/ReadOnlyPickerField";
import { LONG_DATE_FORMAT } from "./utils/dateTimeFormatters";
import { dtDate } from "./utils/dateTimeHelpers";

const dateCalendarLayoutSx = {
  "& .MuiDateCalendar-root.MuiDateCalendar-root": {
    width: "260px",
    maxWidth: "260px",
    padding: "0 15px",
  },
};

export default function RepeatEvent({
  repetition,
  eventStart,
  setRepetition,
  isOwn = true,
}: {
  repetition: RepetitionObject;
  eventStart: Date;
  setRepetition: (repetition: RepetitionObject) => void;
  isOwn?: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const eventStartDay = new Date(eventStart);
  // derive endOption based on repetition
  const getEndOption = () => {
    if (repetition.occurrences && repetition.occurrences > 0) return "after";
    if (repetition.endDate) return "on";
    return "never";
  };

  const [endOption, setEndOption] = useState(getEndOption());

  const endDateValue = useMemo<Dayjs | null>(
    () =>
      repetition.endDate
        ? dayjs(repetition.endDate.slice(0, 10), "YYYY-MM-DD")
        : null,
    [repetition.endDate]
  );

  const handleRepeatEndDateChange = (value: PickerValue) => {
    if (!value || !(value as Dayjs).isValid()) return;
    setRepetition({
      ...repetition,
      occurrences: null,
      endDate: dtDate(value as Dayjs),
    });
  };

  // keep endOption in sync if repetition changes from parent
  useEffect(() => {
    const newEndOption = getEndOption();
    if (endOption !== newEndOption) {
      setEndOption(newEndOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repetition.occurrences, repetition.endDate]);

  const handleDayChange = (day: string) => {
    const currentDays = repetition.byday || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    // Only set byday if there are selected days, otherwise set to null
    setRepetition({
      ...repetition,
      byday: updatedDays.length > 0 ? updatedDays : null,
    });
  };

  const getDayLabel = (day: string) => {
    const dayMap: { [key: string]: string } = {
      MO: t("event.repeat.days.monday"),
      TU: t("event.repeat.days.tuesday"),
      WE: t("event.repeat.days.wednesday"),
      TH: t("event.repeat.days.thursday"),
      FR: t("event.repeat.days.friday"),
      SA: t("event.repeat.days.saturday"),
      SU: t("event.repeat.days.sunday"),
    };
    return dayMap[day] || day;
  };

  return (
    <Box>
      <Stack>
        {/* Interval */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="h6">{t("event.repeat.repeatEvery")}</Typography>
          <TextField
            type="number"
            value={repetition.interval ?? 1}
            disabled={!isOwn}
            onChange={(e) =>
              setRepetition({
                ...repetition,
                interval: Number(e.target.value),
              })
            }
            size="small"
            style={{ width: 80 }}
            inputProps={{ min: 1 }}
          />
          <FormControl size="small" style={{ minWidth: 120 }}>
            <Select
              value={repetition.freq ?? "daily"}
              disabled={!isOwn}
              onChange={(e: SelectChangeEvent) => {
                if (e.target.value === "weekly") {
                  const jsDay = eventStartDay.getDay();
                  const icsDay = days[(jsDay + 6) % 7];
                  setRepetition({
                    ...repetition,
                    freq: e.target.value,
                    byday: [icsDay], // Use byday instead of selectedDays
                  });
                } else {
                  // For non-weekly frequencies, clear byday
                  setRepetition({
                    ...repetition,
                    freq: e.target.value,
                    byday: null,
                  });
                }
              }}
            >
              <MenuItem value={"daily"}>
                {t("event.repeat.frequency.days")}
              </MenuItem>
              <MenuItem value={"weekly"}>
                {t("event.repeat.frequency.weeks")}
              </MenuItem>
              <MenuItem value={"monthly"}>
                {t("event.repeat.frequency.months")}
              </MenuItem>
              <MenuItem value={"yearly"}>
                {t("event.repeat.frequency.years")}
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Weekly selection */}
        {repetition.freq === "weekly" && (
          <Box mb={1}>
            <Typography variant="body2" gutterBottom>
              {t("event.repeat.repeatOn")}
            </Typography>
            <Box display="flex" flexWrap="wrap" sx={{ "& > *:not(:last-child)": { mr: 1 } }}>
              {days.map((dayCode) => {
                const checked = repetition.byday?.includes(dayCode) ?? false;
                const primaryMain = theme.palette.primary.main;
                return (
                  <Box
                    key={dayCode}
                    component="button"
                    type="button"
                    title={getDayLabel(dayCode)}
                    disabled={!isOwn}
                    onClick={() => handleDayChange(dayCode)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: checked ? primaryMain : "#AEAEC0",
                      bgcolor: checked ? primaryMain : "transparent",
                      color: checked ? "#fff" : "#8C9CAF",
                      fontSize: 16,
                      fontWeight: 400,
                      lineHeight: "24px",
                      fontStyle: "normal",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isOwn ? "pointer" : "default",
                      "&:hover": isOwn
                        ? { opacity: 0.9 }
                        : undefined,
                      "&:disabled": { cursor: "default", opacity: 0.7 },
                    }}
                  >
                    {dayCode[0]}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* End options */}
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("event.repeat.end.label")}
          </Typography>
          <RadioGroup
            value={endOption}
            onChange={(e) => {
              const value = e.target.value;
              setEndOption(value);

              if (value === "never") {
                setRepetition({
                  ...repetition,
                  occurrences: null,
                  endDate: null,
                });
              }
              if (value === "after") {
                setRepetition({
                  ...repetition,
                  occurrences:
                    repetition.occurrences && repetition.occurrences > 0
                      ? repetition.occurrences
                      : 1,
                  endDate: null,
                });
              }
              if (value === "on") {
                setRepetition({
                  ...repetition,
                  occurrences: null,
                  endDate: dayjs().format("YYYY-MM-DD"),
                });
              }
            }}
          >
            <FormControlLabel
              disabled={!isOwn}
              value="never"
              control={<Radio />}
              label={
                <Typography variant="h6">
                  {t("event.repeat.end.never")}
                </Typography>
              }
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              disabled={!isOwn}
              value="after"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {t("event.repeat.end.after")}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={repetition.occurrences ?? 1}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRepetition({
                        ...repetition,
                        endDate: null,
                        occurrences: value > 0 ? value : 1,
                      });
                    }}
                    style={{ width: 100 }}
                    inputProps={{ min: 1, "data-testid": "occurrences-input" }}
                    disabled={!isOwn || endOption !== "after"}
                  />
                  <Typography variant="h6">
                    {t("event.repeat.end.occurrences")}
                  </Typography>
                </Box>
              }
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              disabled={!isOwn}
              value="on"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {t("event.repeat.end.on")}
                  </Typography>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale={t("locale") ?? "en"}
                    localeText={{
                      okButtonLabel: t("common.ok"),
                      cancelButtonLabel: t("common.cancel"),
                      todayButtonLabel: t("menubar.today"),
                    }}
                  >
                    <Box
                      sx={{ maxWidth: 300 }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <DatePicker
                        format={LONG_DATE_FORMAT}
                        value={endDateValue}
                        referenceDate={endDateValue ?? dayjs()}
                        onChange={handleRepeatEndDateChange}
                        disabled={!isOwn || endOption !== "on"}
                        slots={{ field: ReadOnlyDateField }}
                        slotProps={{
                          field: {
                            inputProps: { "data-testid": "end-date" },
                            placeholder: "dd/mm/yyyy",
                          } as Record<string, unknown>,
                          layout: { sx: dateCalendarLayoutSx },
                        }}
                      />
                    </Box>
                  </LocalizationProvider>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      </Stack>
    </Box>
  );
}
