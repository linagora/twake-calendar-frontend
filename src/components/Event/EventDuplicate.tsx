import { IconButton, MenuItem } from "@mui/material";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import AddToPhotosIcon from "@mui/icons-material/AddToPhotos";
import { useRef, useState } from "react";
import EventPopover from "../../features/Events/EventModal";
import { CalendarApi, DateSelectArg } from "@fullcalendar/core";

export default function EventDuplication({
  onClose,
  event,
}: {
  onClose: Function;
  event: CalendarEvent;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>({
    start: new Date(event.start),
    startStr: event.start,
    end: new Date(event.end ?? ""),
    endStr: event.end ?? "",
    allDay: event.allday ?? false,
  } as DateSelectArg);
  const calendarRef = useRef<CalendarApi | null>(null);

  const handleClosePopover = () => {
    calendarRef.current?.unselect();
    setSelectedRange(null);
    setOpenModal(!openModal);
    onClose({}, "backdropClick");
  };
  return (
    <>
      <MenuItem
        onClick={() => {
          setOpenModal(true);
        }}
      >
        Duplicate event
      </MenuItem>
      <EventPopover
        anchorEl={null}
        open={openModal}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        calendarRef={calendarRef}
        onClose={handleClosePopover}
        event={event}
      />
    </>
  );
}
