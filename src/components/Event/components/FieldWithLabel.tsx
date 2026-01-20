import { Box, SxProps, Theme, Typography } from "@linagora/twake-mui";
import React from "react";

/**
 * Helper component for field with label
 * Supports two modes: normal (label on top) and expanded (label on left)
 */
export const FieldWithLabel = React.memo(
  ({
    label,
    isExpanded,
    children,
    sx,
  }: {
    label: string | React.ReactNode;
    isExpanded: boolean;
    children: React.ReactNode;
    sx?: SxProps<Theme>;
  }) => {
    if (!isExpanded) {
      // Normal mode: label on top
      const isEmptyLabel =
        label === null ||
        label === undefined ||
        (typeof label === "string" && label.trim() === "");

      return (
        <Box
          sx={[
            {
              "& > *:not(:first-of-type)": {
                marginTop: isEmptyLabel ? 0 : "6px",
              },
              // Only apply margin to direct child MuiTextField-root
              "& > .MuiFormControl-root": {
                marginTop: "6px",
                marginBottom: 0,
              },
              "& > .MuiTextField-root": {
                marginTop: "6px",
                marginBottom: 0,
              },
              // Reset margin for nested MuiTextField-root
              "& .MuiFormControl-root .MuiTextField-root": {
                marginTop: 0,
                marginBottom: 0,
              },
              "& .MuiTextField-root .MuiTextField-root": {
                marginTop: 0,
                marginBottom: 0,
              },
              // Reset margin for nested Box children (DateTimeFields structure)
              "& > .MuiBox-root > .MuiBox-root": {
                marginTop: 0,
              },
              "& > .MuiBox-root > .MuiBox-root > .MuiBox-root": {
                marginTop: 0,
              },
            },
            ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
          ]}
        >
          {!isEmptyLabel && (
            <Typography component="div" variant="h6" sx={{ display: "block" }}>
              {label}
            </Typography>
          )}
          {children}
        </Box>
      );
    }

    // Extended mode: label on left
    return (
      <Box display="flex" alignItems="center" sx={sx}>
        <Typography
          component="div"
          variant="h6"
          sx={{
            minWidth: "115px",
            marginRight: "12px",
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>
        <Box
          flexGrow={1}
          sx={{
            // Set margin-top: 8px for second row in DateTimeFields (4 fields layout)
            "& > .MuiBox-root > .MuiBox-root:nth-of-type(2)": {
              marginTop: "8px",
            },
            // Remove margin from MuiFormControl-root MuiFormControl-marginDense in extended mode
            "& .MuiFormControl-root.MuiFormControl-marginDense": {
              marginTop: 0,
              marginBottom: 0,
            },
            "& .MuiTextField-root.MuiFormControl-marginDense": {
              marginTop: 0,
              marginBottom: 0,
            },
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }
);
