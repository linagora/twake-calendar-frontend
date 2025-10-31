import React from "react";
import { Card, Typography } from "@mui/material";

export function SimpleEventChip({ title }: { title: string }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: "4px",
        px: 0.5,
        py: 0.2,
        boxShadow: "none",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: "0.75rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </Typography>
    </Card>
  );
}
