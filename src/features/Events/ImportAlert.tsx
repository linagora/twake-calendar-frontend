import { Alert, Collapse } from "@mui/material";
import { useState } from "react";
import { useAppSelector } from "../../app/hooks";

export default function ImportAlert() {
  const [visibleAlerts, setVisibleAlerts] = useState<Record<string, boolean>>(
    {}
  );
  const calendars = useAppSelector((state) => state.calendars.list);

  const toggleEventAlert = (eventId: string) => {
    setVisibleAlerts((prev) => ({
      ...prev,
      [eventId]: false,
    }));
  };

  return (
    <>
      {Object.keys(calendars).map((calendarId) =>
        calendars[calendarId].events
          .filter((event) => event.error)
          .map((event) => {
            const isVisible = visibleAlerts[event.uid] ?? true; // default to visible

            return (
              <Collapse in={isVisible} key={event.uid}>
                <Alert
                  severity="error"
                  onClose={() => toggleEventAlert(event.uid)}
                >
                  {event.error}
                </Alert>
              </Collapse>
            );
          })
      )}
    </>
  );
}
