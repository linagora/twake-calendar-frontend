# Custom MUI Theme

## Tổng quan

Project này sử dụng custom MUI theme để tùy chỉnh Typography, Colors và Components theo thiết kế của Twake Calendar.

## Cấu trúc Files

```
src/theme/
├── theme.ts          # Định nghĩa custom theme
├── ThemeProvider.tsx # ThemeProvider wrapper
└── README.md         # Documentation này
```

## Custom Theme Features

### 🎨 **Colors**

- **Primary**: `#1976d2` (Blue)
- **Secondary**: `#dc004e` (Pink/Red)
- **Text Primary**: `#000000` (Black)
- **Text Secondary**: `#8C9CAF` (Custom gray)
- **Divider**: `#C9CACC` (Custom divider)

### 📝 **Typography**

- **Font Family**: Inter (với fallbacks)
- **Custom Variants**: Tất cả variants đều được tùy chỉnh
- **Event Info Text**: Caption variant với fontSize 14px và color text.secondary

### 🔘 **Components**

- **Buttons**: BorderRadius 8px (default), 50px (pill-shaped)
- **Dialogs**: BorderRadius 12px
- **DialogActions**: Padding 18px top/bottom

## Cách sử dụng

### 1. Sử dụng Theme Colors

```tsx
import { useTheme } from "@mui/material/styles";

function MyComponent() {
  const theme = useTheme();

  return (
    <Typography sx={{ color: "text.secondary" }}>
      Text với màu secondary
    </Typography>
  );
}
```

### 2. Sử dụng Typography Variants

```tsx
// Caption với custom styling
<Typography variant="caption">
  Text nhỏ với màu secondary
</Typography>

// Body2 với Inter font
<Typography variant="body2">
  Text body với Inter font
</Typography>
```

### 3. Sử dụng Component Overrides

```tsx
// Button tự động có borderRadius 8px
<Button variant="contained">
  Normal Button
</Button>

// Pill-shaped button cho RSVP
<Button
  variant="contained"
  sx={{ borderRadius: '50px' }}
>
  RSVP Button
</Button>
```

## Tùy chỉnh Theme

### Thêm màu mới

```typescript
// Trong theme.ts
palette: {
  custom: {
    main: '#your-color',
    light: '#lighter-color',
    dark: '#darker-color',
  },
}
```

### Thêm Typography variant mới

```typescript
// Trong theme.ts
typography: {
  customVariant: {
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: 1.5,
  },
}
```

### Override Component styles

```typescript
// Trong theme.ts
components: {
  MuiComponentName: {
    styleOverrides: {
      root: {
        // Custom styles
      },
    },
  },
}
```

## Migration sang Cozy UI

Khi sẵn sàng migrate sang Cozy UI:

1. **Cài đặt Cozy UI**:

   ```bash
   npm install cozy-ui
   ```

2. **Thay đổi ThemeProvider**:

   ```tsx
   // Thay vì CustomThemeProvider
   import { MuiCozyTheme } from "cozy-ui/React/MuiCozyTheme";

   <MuiCozyTheme>{children}</MuiCozyTheme>;
   ```

3. **Cập nhật colors**: Cozy UI sẽ có colors riêng, chỉ cần update palette trong theme.ts

## Best Practices

1. **Sử dụng theme colors**: Thay vì hard-coded colors
2. **Consistent spacing**: Sử dụng theme.spacing()
3. **Typography variants**: Sử dụng predefined variants
4. **Component overrides**: Tùy chỉnh qua theme thay vì inline styles
5. **TypeScript**: Sử dụng CustomTheme type cho type safety

## Ví dụ thực tế

```tsx
// Event Preview Modal với custom theme
<Typography
  variant="h5"
  sx={{
    fontSize: '24px',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif' // Tự động từ theme
  }}
>
  Event Title
</Typography>

<Typography
  variant="caption" // Tự động có fontSize 14px và color text.secondary
>
  Show more
</Typography>

<Button
  variant="contained"
  sx={{ borderRadius: '50px' }} // Pill-shaped
>
  Accept
</Button>
```
