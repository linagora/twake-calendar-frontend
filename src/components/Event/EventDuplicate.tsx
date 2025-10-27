import { MenuItem } from "@mui/material";
import { CalendarEvent } from "../../features/Events/EventsTypes";

export default function EventDuplication({
  onClose,
  event,
  onOpenDuplicate,
}: {
  onClose: Function;
  event: CalendarEvent;
  onOpenDuplicate?: () => void;
}) {
  return (
    <MenuItem
      onClick={() => {
        onOpenDuplicate?.();
      }}
    >
      Duplicate event
    </MenuItem>
  );
}
