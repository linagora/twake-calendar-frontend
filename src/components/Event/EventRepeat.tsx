import {
  FormControl,
  Select,
  SelectChangeEvent,
  MenuItem,
  Box,
  Stack,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from "@mui/material";
import { useEffect, useState } from "react";
import { RepetitionObject } from "../../features/Events/EventsTypes";

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
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const day = new Date(eventStart);

  // derive endOption based on repetition
  const getEndOption = () => {
    if (repetition.occurrences && repetition.occurrences >= 0) return "after";
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
    const updatedDays = repetition.selectedDays?.includes(day)
      ? repetition.selectedDays.filter((d) => d !== day)
      : [...(repetition.selectedDays ?? []), day];

    setRepetition({ ...repetition, selectedDays: updatedDays });
  };

  return (
    <Box>
      <Stack>
        {/* Interval */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography>Repeat every</Typography>
          <TextField
            type="number"
            value={repetition.interval ?? 1}
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
              onChange={(e: SelectChangeEvent) => {
                if (e.target.value === "weekly") {
                  setRepetition({
                    ...repetition,
                    freq: e.target.value,
                    selectedDays: [days[day.getDay() - 1]],
                  });
                } else {
                  setRepetition({ ...repetition, freq: e.target.value });
                }
              }}
            >
              <MenuItem value={"daily"}>Day(s)</MenuItem>
              <MenuItem value={"weekly"}>Week(s)</MenuItem>
              <MenuItem value={"monthly"}>Month(s)</MenuItem>
              <MenuItem value={"yearly"}>Year(s)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Weekly selection */}
        {repetition.freq === "weekly" && (
          <Box>
            <Typography variant="body2" gutterBottom>
              Repeat on:
            </Typography>
            <FormGroup row>
              {days.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={repetition.selectedDays?.includes(day) ?? false}
                      onChange={() => handleDayChange(day)}
                    />
                  }
                  label={day}
                />
              ))}
            </FormGroup>
          </Box>
        )}

        {/* End options */}
        <Box>
          <Typography variant="body2" gutterBottom>
            End:
          </Typography>
          <RadioGroup
            value={endOption}
            onChange={(e) => {
              const value = e.target.value;
              setEndOption(value);

              if (value === "never") {
                setRepetition({ ...repetition, occurrences: 0, endDate: "" });
              }
              if (value === "after") {
                setRepetition({
                  ...repetition,
                  occurrences: 0,
                  endDate: "",
                });
              }
              if (value === "on") {
                setRepetition({
                  ...repetition,
                  occurrences: 0,
                  endDate: new Date().toISOString().slice(0, 16),
                });
              }
            }}
          >
            <FormControlLabel value="never" control={<Radio />} label="Never" />

            <FormControlLabel
              value="after"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  After
                  <TextField
                    type="number"
                    size="small"
                    value={repetition.occurrences ?? 0}
                    onChange={(e) =>
                      setRepetition({
                        ...repetition,
                        endDate: "",
                        occurrences: Number(e.target.value),
                      })
                    }
                    style={{ width: 100 }}
                    inputProps={{ min: 1 }}
                    disabled={endOption !== "after"}
                  />
                  occurrences
                </Box>
              }
            />

            <FormControlLabel
              value="on"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  On
                  <TextField
                    type="date"
                    inputProps={{ "data-testid": "end-date" }}
                    size="small"
                    value={repetition.endDate ?? ""}
                    onChange={(e) =>
                      setRepetition({
                        ...repetition,
                        occurrences: 0,
                        endDate: e.target.value,
                      })
                    }
                    disabled={endOption !== "on"}
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
