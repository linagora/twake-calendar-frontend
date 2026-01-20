import { EventErrorHandler } from "@/components/Error/EventErrorHandler";
import { Card, Typography } from "@linagora/twake-mui";
import { useEffect, useRef } from "react";

export function ErrorEventChip({
  event,
  errorHandler,
  error,
}: {
  event: any;
  errorHandler: EventErrorHandler;
  error: any;
}) {
  const hasReported = useRef(false);

  useEffect(() => {
    if (!hasReported.current) {
      const message =
        error instanceof Error
          ? error.message
          : `${error.class} error during rendering ${event._def.extendedProps.uid || event.id}`;
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
