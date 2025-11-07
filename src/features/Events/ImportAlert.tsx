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
      {Object.keys(calendars || {}).map((calendarId) =>
        calendars?.[calendarId]?.events
          ? Object.keys(calendars[calendarId]?.events)
              .filter((id) => calendars[calendarId]?.events[id].error)
              .map((id) => {
                const isVisible =
                  visibleAlerts[calendars[calendarId].events[id].uid] ?? true; // default to visible

                return (
                  <Collapse
                    in={isVisible}
                    key={calendars[calendarId].events[id].uid}
                  >
                    <Alert
                      severity="error"
                      onClose={() =>
                        toggleEventAlert(calendars[calendarId].events[id].uid)
                      }
                    >
                      {calendars[calendarId].events[id].error}
                    </Alert>
                  </Collapse>
                );
              })
          : []
      )}
    </>
  );
}
