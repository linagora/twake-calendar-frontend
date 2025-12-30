import React from "react";
import { Box, Typography } from "@linagora/twake-mui";

/**
 * Helper component for field with label
 * Supports two modes: normal (label on top) and expanded (label on left)
 */
export const FieldWithLabel = React.memo(
  ({
    label,
    isExpanded,
    children,
  }: {
    label: string | React.ReactNode;
    isExpanded: boolean;
    children: React.ReactNode;
  }) => {
    if (!isExpanded) {
      // Normal mode: label on top
      return (
        <Box>
          <Typography
            component="div"
            sx={{
              display: "block",
              marginBottom: "4px",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>
          {children}
        </Box>
      );
    }

    // Extended mode: label on left
    return (
      <Box display="flex" alignItems="center">
        <Typography
          component="div"
          sx={{
            minWidth: "115px",
            marginRight: "12px",
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>
        <Box flexGrow={1}>{children}</Box>
      </Box>
    );
  }
);
