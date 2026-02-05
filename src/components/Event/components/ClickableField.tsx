import { Box, Typography, useTheme } from "@linagora/twake-mui";
import { alpha } from "@mui/material/styles";
import React from "react";

interface ClickableFieldProps {
  icon: React.ReactNode;
  text?: string;
  onClick: () => void;
  iconColor?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}

export const ClickableField: React.FC<ClickableFieldProps> = ({
  icon,
  text,
  onClick,
  iconColor,
  children,
  ariaLabel,
}) => {
  const theme = useTheme();

  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ?? text}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: "flex",
        alignItems: children ? "flex-start" : "center",
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: "4px",
        "&:hover": {
          backgroundColor: "action.hover",
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: "2px",
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
          color: iconColor || alpha(theme.palette.grey[900], 0.9),
          "& svg": {
            width: "24px",
            height: "24px",
          },
          "& img": {
            width: "24px",
            height: "24px",
          },
        }}
      >
        {icon}
      </Box>
      {children ? (
        <Box flex={1}>{children}</Box>
      ) : (
        <Typography
          sx={{
            fontSize: "14px",
            color: alpha(theme.palette.grey[900], 0.9),
            fontWeight: 500,
          }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};
