import React from "react";
import { Card, Typography } from "@mui/material";
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
  const message =
    error instanceof Error ? error.message : "Unknown error during rendering";
  errorHandler.reportError(event._def.extendedProps.uid || event.id, message);

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
