import { createTheme } from "@mui/material/styles";

// Custom theme for Twake Calendar
export const customTheme = createTheme({
  palette: {
    text: {
      primary: "#000000",
      secondary: "#717D96",
      secondaryContainer: "#243B55",
    },
  },
  typography: {
    caption: {
      fontSize: "0.75rem",
      fontWeight: 400,
      lineHeight: 1.4,
      color: "#8C9CAF", // Custom secondary text color
    },
  },
  components: {
    // Custom Typography component
    MuiTypography: {
      styleOverrides: {
        // Custom variant for event info text
        caption: {
          fontSize: "13px",
          color: "#717D96",
        },
      },
    },
    // Custom Button component
    // Custom Dialog component
    // Custom DialogActions component
  },
});

// Export theme type for TypeScript
export type CustomTheme = typeof customTheme;
