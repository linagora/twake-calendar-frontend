import {
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
} from "@mui/material";

export default function RepeatEvent({
  repetition,
  setRepetition,
  isOwn = true,
}: {
  repetition: string;
  setRepetition: Function;
  isOwn?: boolean;
}) {
  return (
    <FormControl fullWidth margin="dense" size="small">
      <InputLabel id="repeat">Repetition</InputLabel>
      <Select
        labelId="repeat"
        value={repetition}
        disabled={!isOwn}
        label="Repetition"
        onChange={(e: SelectChangeEvent) => setRepetition(e.target.value)}
      >
        <MenuItem value={""}>No Repetition</MenuItem>
        <MenuItem value={"daily"}>Repeat daily</MenuItem>
        <MenuItem value={"weekly"}>Repeat weekly</MenuItem>
        <MenuItem value={"monthly"}>Repeat monthly</MenuItem>
        <MenuItem value={"yearly"}>Repeat yearly</MenuItem>
      </Select>
    </FormControl>
  );
}
