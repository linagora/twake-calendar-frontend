import {
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Box,
  Stack,
  Paper,
  Typography,
  TextField,
  Checkbox,
  List,
  ListItem,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from "@mui/material";
import { useState } from "react";
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
  console.log(JSON.stringify(repetition));

  const repetitionValues = ["day", "week", "month", "year"];
  const [interval, setInterval] = useState(repetition.interval ?? 0);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    repetition.selectedDays ?? []
  );
  const [endOption, setEndOption] = useState("");
  const [occurrences, setOccurrences] = useState(repetition.occurrences) ?? 0;
  const [endDate, setEndDate] = useState(repetition.endDate ?? "");
  const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  const handleDayChange = (day: string) => {
    setSelectedDays((prev: string[]) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography>Interval:</Typography>
            <TextField
              type="number"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
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
                        checked={selectedDays.includes(day)}
                        onChange={() => handleDayChange(day)}
                      />
                    }
                    label={day}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
          <Box>
            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
              End:
            </Typography>
            <RadioGroup
              value={endOption}
              onChange={(e) => setEndOption(e.target.value)}
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
                      value={occurrences}
                      onChange={(e) => setOccurrences(Number(e.target.value))}
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
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
