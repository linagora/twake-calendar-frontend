import { useEffect, useState } from "react";
import {
  createCalendarAsync /*, updateCalendarAsync */,
  patchCalendarAsync,
} from "./CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Popover,
  TextField,
  Button,
  Box,
  Typography,
  ButtonGroup,
} from "@mui/material";
import { Calendars } from "./CalendarTypes";

function CalendarPopover({
  anchorEl,
  open,
  onClose,
  calendar,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (
    event: object | null,
    reason: "backdropClick" | "escapeKeyDown"
  ) => void;
  calendar?: Calendars;
}) {
  const dispatch = useAppDispatch();
  const userId =
    useAppSelector((state) => state.user.userData.openpaasId) ?? "";
  const [name, setName] = useState(calendar?.name ?? "");
  const [description, setDescription] = useState(calendar?.description ?? "");
  const [color, setColor] = useState(calendar?.color ?? "");

  useEffect(() => {
    if (calendar) {
      setName(calendar.name);
      setDescription(calendar.description ?? "");
      setColor(calendar.color ?? "");
    } else {
      setName("");
      setDescription("");
      setColor("");
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

      setName("");
      setDescription("");
      setColor("");
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
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={(e, reason) => onClose(e, reason)}
      anchorOrigin={{ vertical: "center", horizontal: "center" }}
      transformOrigin={{ vertical: "center", horizontal: "center" }}
    >
      <Box p={2}>
        <Typography
          variant="h6"
          gutterBottom
          style={{ backgroundColor: color }}
        >
          Calendar configuration
        </Typography>
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
        <ButtonGroup>
          {palette.map((c) => (
            <Button
              key={c}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </ButtonGroup>
        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
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
        </Box>
      </Box>
    </Popover>
  );
}

export default CalendarPopover;
