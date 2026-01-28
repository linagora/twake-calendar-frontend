import { Box, Typography, useTheme } from "@linagora/twake-mui";
import { alpha } from "@mui/material/styles";
import React from "react";

export interface SectionPreviewRowProps {
  icon: React.ReactNode;
  /** Primary text or custom content. If string, rendered with fontSize 14px, fontWeight 500. */
  children: React.ReactNode;
  onClick: () => void;
  iconColor?: string;
}

/**
 * Reusable preview row for event modal sections (normal mode).
 * Layout: icon left (max 32x32), content right. No button.
 */
export const SectionPreviewRow: React.FC<SectionPreviewRowProps> = ({
  icon,
  children,
  onClick,
  iconColor,
}) => {
  const theme = useTheme();
  const color = iconColor ?? alpha(theme.palette.grey[900], 0.9);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: "4px",
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "24px",
          maxHeight: "24px",
          marginRight: "12px",
          flexShrink: 0,
          color,
          "& svg": {
            maxWidth: "24px",
            maxHeight: "24px",
          },
          "& img": {
            maxWidth: "24px",
            maxHeight: "24px",
          },
        }}
      >
        {icon}
      </Box>
      <Box flex={1} minWidth={0}>
        {typeof children === "string" ? (
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 500,
              color,
            }}
          >
            {children}
          </Typography>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
};
