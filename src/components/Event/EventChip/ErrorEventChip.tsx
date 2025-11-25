import { Card, Typography } from "@mui/material";
import { useRef, useEffect } from "react";
import { EventErrorHandler } from "../../Error/EventErrorHandler";

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
          : "Unknown error during rendering";
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
