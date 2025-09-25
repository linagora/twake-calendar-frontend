import { useEffect, useState } from "react";
import {
  createCalendarAsync /*, updateCalendarAsync */,
  patchCalendarAsync,
} from "../../features/Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ColorPicker } from "./CalendarColorPicker";
import { Calendars } from "../../features/Calendars/CalendarTypes";

function CalendarPopover({
  open,
  onClose,
  calendar,
}: {
  open: boolean;
  onClose: (
    event: object | null,
    reason: "backdropClick" | "escapeKeyDown"
  ) => void;
  calendar?: Calendars;
}) {
  const dispatch = useAppDispatch();
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const [name, setName] = useState(calendar?.name ?? "");
  const [description, setDescription] = useState(calendar?.description ?? "");
  const [color, setColor] = useState(calendar?.color ?? "");

  useEffect(() => {
    if (open) {
      if (calendar) {
        setName(calendar.name);
        setDescription(calendar.description ?? "");
        setColor(calendar.color ?? "");
      } else {
        setName("");
        setDescription("");
        setColor("");
      }
    }
  }, [calendar, open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (trimmedName) {
      const calId = calendar ? calendar.id : crypto.randomUUID();

      if (calendar?.id) {
        dispatch(
          patchCalendarAsync({
            calId: calendar.id,
            calLink: calendar.link,
            patch: { name: trimmedName, desc: trimmedDesc, color },
          })
        );
      } else {
        dispatch(
          createCalendarAsync({
            name: trimmedName,
            desc: trimmedDesc,
            color,
            userId,
            calId,
          })
        );
      }

      onClose({}, "backdropClick");
    }
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
    <Dialog open={open} onClose={(e, reason) => onClose(e, reason)}>
      <DialogTitle style={{ backgroundColor: color }}>
        Calendar configuration
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          margin="dense"
        />
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          margin="dense"
          multiline
          rows={2}
        />
        <ColorPicker
          onChange={(color) => setColor(color)}
          selectedColor={color}
        />
      </DialogContent>

      <DialogActions>
        <Button
          variant="outlined"
          onClick={(e) => onClose({}, "backdropClick")}
        >
          Cancel
        </Button>
        <Button
          disabled={!name.trim()}
          variant="contained"
          onClick={handleSave}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CalendarPopover;
