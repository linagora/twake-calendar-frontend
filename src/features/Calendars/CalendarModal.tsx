import { ChangeEvent, useState } from "react";
import { createCalendar } from "./CalendarSlice";
import { useAppDispatch } from "../../app/hooks";
import { Button } from "cozy-ui/transpiled/react";
import Dialog, {
  DialogActions,
  DialogContent,
  DialogTitle,
} from "cozy-ui/transpiled/react/Dialog";
import ToggleButtonGroup from "cozy-ui/transpiled/react/ToggleButtonGroup";
import ToggleButton from "cozy-ui/transpiled/react/ToggleButton";
import TextField from "cozy-ui/transpiled/react/TextField";

function CalendarPopover({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (Calendar: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const timezones = Intl.supportedValuesOf?.("timeZone") ?? [];
  const handleSave = () => {
    dispatch(createCalendar({ name, description, color }));
    onClose({}, "backdropClick");

    // Reset
    setName("");
    setDescription("");
  };
  const palette = [
    "#D50000",
    "#E67C73",
    "#F4511E",
    "#F6BF26",
    "#33B679",
    "#0B8043",
    "#039BE5",
    "#3F51B5",
    "#7986CB",
    "#8E24AA",
    "#616161",
  ];
  return (
    <Dialog
      className={"h3"}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
    >
      <DialogTitle style={{ backgroundColor: color }} color={color}>
        Create a Calendar
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setName(e.target.value)
          }
          size="small"
          margin="dense"
        />
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setDescription(e.target.value)
          }
          size="small"
          margin="dense"
          multiline
          rows={2}
        />
        <ToggleButtonGroup>
          {palette.map((color) => (
            <ToggleButton
              style={{ backgroundColor: color }}
              onClick={() => setColor(color)}
            />
          ))}
        </ToggleButtonGroup>
        <TextField
          fullWidth
          select
          label="timeZone"
          value={timeZone}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setTimeZone(e.target.value)
          }
        >
          {timezones.map((zone: string) => (
            <div>{zone}</div>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        {" "}
        <Button variant="outlined" onClick={() => onClose({}, "backdropClick")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CalendarPopover;
