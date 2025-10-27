# Custom MUI Theme

## Overview

This project uses a custom MUI theme to customize Typography, colors and components according to Twake Calendar design.

## File Structure

```
src/theme/
├── theme.ts          # Custom theme definition
├── ThemeProvider.tsx # ThemeProvider wrapper
└── README.md         # This documentation
```

## Custom Theme Features

### Colors

- **Text Primary**: `#000000` (Black)
- **Text Secondary**: `#717D96` (Custom gray)
- **Text Secondary Container**: `#243B55` (Dark gray)

### Typography

- **Caption**: fontSize 13px, color `#717D96`

### Components

- **Typography**: Custom styled caption variant

## Usage

### Using CustomThemeProvider

Import and use `CustomThemeProvider` to wrap your application:

```tsx
import { CustomThemeProvider } from "./theme/ThemeProvider";

function App() {
  return <CustomThemeProvider>{/* Your application */}</CustomThemeProvider>;
}
```

### Accessing the Theme

Use `useTheme` to access theme variables:

```tsx
import { useTheme } from "@mui/material/styles";

function MyComponent() {
  const theme = useTheme();
  const textColor = theme.palette.text.secondary;
}
```

### CSS Variables

Use theme variables directly in CSS:

```tsx
<Typography sx={{ color: "text.secondary" }}>
  Text with secondary color
</Typography>
```

### Typography

Use predefined typography variants:

```tsx
<Typography variant="caption">Caption text</Typography>
```

### Customizing Styles

Modify styles in `theme.ts` to customize components:

```typescript
components: {
  MuiTypography: {
    styleOverrides: {
      caption: {
        fontSize: "13px",
        color: "#717D96",
      },
    },
  },
}
```

## Migration to Cozy UI

### Installation

```bash
npm install cozy-ui
```

### Replacing ThemeProvider

In your main file, replace `CustomThemeProvider` with `MuiCozyTheme`:

```tsx
import { MuiCozyTheme } from "cozy-ui/React/MuiCozyTheme";

<MuiCozyTheme>{children}</MuiCozyTheme>;
```

### Updating Palette

Adapt the color palette in `theme.ts` to use Cozy UI colors. Cozy UI provides its own colors that can be integrated into the theme configuration.

### Component Migration

Update components to use Cozy UI components instead of standard MUI components, following Cozy UI documentation for specific components.
