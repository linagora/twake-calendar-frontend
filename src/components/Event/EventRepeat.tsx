import { RepetitionObject } from "@/features/Events/EventsTypes";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@linagora/twake-mui";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";

export default function RepeatEvent({
  repetition,
  eventStart,
  setRepetition,
  isOwn = true,
}: {
  repetition: RepetitionObject;
  eventStart: Date;
  setRepetition: Function;
  isOwn?: boolean;
}) {
  const { t } = useI18n();
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const day = new Date(eventStart);
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
          <Box>
            <Typography variant="body2" gutterBottom>
              {t("event.repeat.repeatOn")}
            </Typography>
            <FormGroup row>
              {days.map((day) => (
                <FormControlLabel
                  key={day}
                  disabled={!isOwn}
                  control={
                    <Checkbox
                      checked={repetition.byday?.includes(day) ?? false}
                      onChange={() => handleDayChange(day)}
                    />
                  }
                  label={getDayLabel(day)}
                />
              ))}
            </FormGroup>
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
                  endDate: new Date().toISOString().slice(0, 16),
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
                  <TextField
                    type="date"
                    inputProps={{ "data-testid": "end-date" }}
                    size="small"
                    value={repetition.endDate ?? ""}
                    onChange={(e) =>
                      setRepetition({
                        ...repetition,
                        occurrences: null,
                        endDate: e.target.value,
                      })
                    }
                    disabled={!isOwn || endOption !== "on"}
                  />
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      </Stack>
    </Box>
  );
}
