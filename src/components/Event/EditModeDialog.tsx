import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import { getEventAsync } from "../../features/Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useState } from "react";

export function EditModeDialog({
  type,
  setOpen,
  event,
  eventAction,
}: {
  type: string | null;
  setOpen: (e: string | null) => void;
  event: CalendarEvent;
  eventAction: (type: "solo" | "all" | undefined) => void;
}) {
  const [typeOfAction, setTypeOfAction] = useState<"solo" | "all" | undefined>(
    "solo"
  );
  const handleEvent = async () => {
    eventAction(typeOfAction);
    handleClose();
  };
  const handleClose = () => {
    setOpen(null);
    setTypeOfAction("solo");
  };
  return (
    <Dialog open={Boolean(type)} onClose={handleClose}>
      <DialogTitle>
        {type === "edit" && "Update the reccurent event"}
        {type === "attendance" && "Update the participation status"}
      </DialogTitle>
      <DialogContent>
        <RadioGroup
          value={typeOfAction}
          onChange={(e) => setTypeOfAction(e.target.value)}
        >
          <FormControlLabel
            value="solo"
            control={<Radio />}
            label="This event"
          />
          <FormControlLabel
            value="all"
            control={<Radio />}
            label="All the events"
          />
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <ButtonGroup>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleEvent}>Ok</Button>
        </ButtonGroup>
      </DialogActions>
    </Dialog>
  );
}
