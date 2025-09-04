import {
  FormControl,
  InputLabel,
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
  setRepetition,
  isOwn = true,
}: {
  repetition: RepetitionObject;
  setRepetition: Function;
  isOwn?: boolean;
}) {
  const repetitionValues = ["day", "week", "month", "year"];
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  // derive endOption based on repetition
  const getEndOption = () => {
    if (repetition.occurrences && repetition.occurrences >= 0) return "after";
    if (repetition.endDate) return "on";
    return "never";
  };

  const [endOption, setEndOption] = useState(getEndOption());

  // keep endOption in sync if repetition changes from parent
  useEffect(() => {
    if (!endOption) {
      setEndOption(getEndOption());
    }
  }, [repetition.occurrences, repetition.endDate]);

  const handleDayChange = (day: string) => {
    const updatedDays = repetition.selectedDays?.includes(day)
      ? repetition.selectedDays.filter((d) => d !== day)
      : [...(repetition.selectedDays ?? []), day];

    setRepetition({ ...repetition, selectedDays: updatedDays });
  };

  return (
    <FormControl fullWidth margin="dense" size="small">
      <InputLabel id="repeat">Repetition</InputLabel>
      <Select
        labelId="repeat"
        value={repetition.freq ?? ""}
        disabled={!isOwn}
        label="Repetition"
        onChange={(e: SelectChangeEvent) =>
          setRepetition({ ...repetition, freq: e.target.value })
        }
      >
        <MenuItem value={""}>No Repetition</MenuItem>
        <MenuItem value={"daily"}>Repeat daily</MenuItem>
        <MenuItem value={"weekly"}>Repeat weekly</MenuItem>
        <MenuItem value={"monthly"}>Repeat monthly</MenuItem>
        <MenuItem value={"yearly"}>Repeat yearly</MenuItem>
      </Select>

      {repetition.freq && (
        <Stack>
          {/* Interval */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography>Interval:</Typography>
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
              sx={{ width: 80 }}
            />
            <Typography>
              {
                repetitionValues[
                  repetitionValues.findIndex((el) => el === repetition.freq)
                ]
              }
            </Typography>
          </Box>

          {/* Weekly selection */}
          {repetition.freq === "weekly" && (
            <Box>
              <Typography variant="body2" gutterBottom>
                On days:
              </Typography>
              <FormGroup row>
                {days.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={
                          repetition.selectedDays?.includes(day) ?? false
                        }
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
            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
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
              <FormControlLabel
                value="never"
                control={<Radio />}
                label="Never"
              />

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
                          freq: repetition.freq,
                          interval: repetition.interval,
                          occurrences: Number(e.target.value),
                        })
                      }
                      sx={{ width: 100 }}
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
                      size="small"
                      value={repetition.endDate ?? ""}
                      onChange={(e) =>
                        setRepetition({
                          freq: repetition.freq,
                          interval: repetition.interval,
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
      )}
    </FormControl>
  );
}
