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
} from "@linagora/twake-mui";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import "dayjs/locale/ru";
import "dayjs/locale/vi";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { ReadOnlyDateField } from "./components/ReadOnlyPickerField";
import { LONG_DATE_FORMAT } from "./utils/dateTimeFormatters";

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
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const day = new Date(eventStart);
  const dateCalendarLayoutSx = {
    "& .MuiDateCalendar-root.MuiDateCalendar-root": {
      width: "260px",
      maxWidth: "260px",
      padding: "0 15px",
    },
  };
  // derive endOption based on repetition
  const getEndOption = () => {
    if (repetition.occurrences && repetition.occurrences > 0) return "after";
    if (repetition.endDate) return "on";
    return "never";
  };

  const [endOption, setEndOption] = useState(getEndOption());

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
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Typography variant="h6">{t("event.repeat.every")}</Typography>
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
            inputProps={{
              min: 1,
              style: {
                textAlign: "center",
                paddingRight: 5,
              },
            }}
          />
          <FormControl size="small" style={{ minWidth: 120 }}>
            <Select
              value={repetition.freq ?? "daily"}
              disabled={!isOwn}
              onChange={(e: SelectChangeEvent) => {
                if (e.target.value === "weekly") {
                  // Adjust day index for MO-SU (0-6) to match JS getDay() (0-6, SU is 0)
                  const jsDay = day.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                  const icsDay = days[(jsDay + 6) % 7]; // MO is 0, TU is 1, ..., SU is 6
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
          <Box mb={2}>
            <Box display="flex" gap={1}>
              {days.map((dayCode) => {
                const isSelected = repetition.byday?.includes(dayCode) ?? false;
                const label = getDayLabel(dayCode).charAt(0);

                return (
                  <Box
                    key={dayCode}
                    onClick={() => {
                      if (!isOwn) return;
                      handleDayChange(dayCode);
                    }}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "4px",
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "#AEAEC0",
                      color: isSelected ? "#fff" : "#8C9CAF",
                      fontSize: 16,
                      fontWeight: 400,
                      lineHeight: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      bgcolor: isSelected ? "primary.main" : "transparent",
                      cursor: isOwn ? "pointer" : "default",
                      "&:hover": isOwn
                        ? {
                            borderColor: "primary.main",
                            bgcolor: "primary.main",
                            color: "#fff",
                          }
                        : undefined,
                    }}
                  >
                    {label}
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
              if (value === endOption) return;

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
                  endDate:
                    repetition.endDate ?? new Date().toISOString().slice(0, 10),
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
            />

            <FormControlLabel
              disabled={!isOwn}
              value="on"
              sx={{ mt: 1 }}
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {t("event.repeat.end.on")}
                  </Typography>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale={t("locale") ?? "en"}
                  >
                    <Box
                      sx={{
                        width: 220,
                        "& .MuiInputBase-root": { fontSize: 14 },
                        "& .MuiInputBase-input": { fontSize: 14 },
                      }}
                    >
                      <DatePicker
                        sx={{ width: "100%" }}
                        format={LONG_DATE_FORMAT}
                        value={
                          repetition.endDate ? dayjs(repetition.endDate) : null
                        }
                        onChange={(value) => {
                          if (!value || !value.isValid()) return;
                          const newDateStr = value.format("YYYY-MM-DD");
                          setRepetition({
                            ...repetition,
                            occurrences: null,
                            endDate: newDateStr,
                          });
                          if (endOption !== "on") {
                            setEndOption("on");
                          }
                        }}
                        onOpen={() => {
                          if (!isOwn || endOption === "on") return;
                          setEndOption("on");
                          if (!repetition.endDate) {
                            setRepetition({
                              ...repetition,
                              occurrences: null,
                              endDate: new Date().toISOString().slice(0, 10),
                            });
                          } else {
                            setRepetition({
                              ...repetition,
                              occurrences: null,
                              endDate: repetition.endDate,
                            });
                          }
                        }}
                        slots={{ field: ReadOnlyDateField }}
                        slotProps={{
                          field: {},
                          layout: { sx: dateCalendarLayoutSx },
                        }}
                        disabled={!isOwn}
                      />
                    </Box>
                  </LocalizationProvider>
                </Box>
              }
            />

            <FormControlLabel
              disabled={!isOwn}
              value="after"
              control={<Radio />}
              sx={{ mt: 1 }}
              label={
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  onClick={() => {
                    if (!isOwn || endOption === "after") return;
                    setEndOption("after");
                    setRepetition({
                      ...repetition,
                      endDate: null,
                      occurrences:
                        repetition.occurrences && repetition.occurrences > 0
                          ? repetition.occurrences
                          : 1,
                    });
                  }}
                >
                  <Typography variant="h6">
                    {t("event.repeat.end.after")}
                  </Typography>
                  <TextField
                    type="number"
                    inputProps={{ min: 1, "data-testid": "occurrences-input" }}
                    size="small"
                    value={repetition.occurrences ?? 1}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRepetition({
                        ...repetition,
                        endDate: null,
                        occurrences: value > 0 ? value : 1,
                      });
                      if (endOption !== "after") {
                        setEndOption("after");
                      }
                    }}
                    style={{ width: 100 }}
                    disabled={!isOwn}
                  />
                  <Typography variant="h6">
                    {t("event.repeat.end.occurrences")}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      </Stack>
    </Box>
  );
}
