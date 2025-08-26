import {
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
} from "@mui/material";

export default function RepeatEvent({
  eventClass,
  setEventClass,
}: {
  eventClass: string;
  setEventClass: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <FormControl fullWidth margin="dense" size="small">
      <InputLabel id="repeat">is Busy</InputLabel>
      <Select
        labelId="busy"
        value={eventClass}
        label="is busy"
        onChange={(e: SelectChangeEvent) => setEventClass(e.target.value)}
      >
        <MenuItem value={"free"}>Free</MenuItem>
        <MenuItem value={"busy"}>Busy </MenuItem>
      </Select>
    </FormControl>
  );
}
