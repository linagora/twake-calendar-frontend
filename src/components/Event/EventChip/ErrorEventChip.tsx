import { EventErrorHandler } from "@/components/Error/EventErrorHandler";
import { EventContentArg } from "@fullcalendar/core";
import { Card, Typography } from "@linagora/twake-mui";
import { useEffect, useRef } from "react";

export function ErrorEventChip({
  event,
  errorHandler,
  error,
}: {
  event: EventContentArg["event"];
  errorHandler: EventErrorHandler;
  error: unknown;
}) {
  const hasReported = useRef(false);

  useEffect(() => {
    if (!hasReported.current) {
      let message: string;

      if (error instanceof Error) {
        message = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "class" in error
      ) {
        message = `${String(
          (error as { class: string }).class
        )} error during rendering ${event._def.extendedProps.uid || event.id}`;
      } else {
        message = `Unknown error during rendering ${event._def.extendedProps.uid || event.id}`;
      }

      errorHandler.reportError(
        event._def.extendedProps.uid || event.id,
        message
      );
      hasReported.current = true;
    }
  }, [event, errorHandler, error]);

  return (
    <Card
      variant="outlined"
      sx={{
        px: 0.5,
        py: 0.2,
        borderRadius: "4px",
        boxShadow: "none",
      }}
    >
      <Typography variant="body2">{event.title}</Typography>
    </Card>
  );
}
