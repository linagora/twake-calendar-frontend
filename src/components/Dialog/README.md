# ResponsiveDialog Component

A highly reusable dialog component that supports both normal and expanded (fullscreen) modes while preserving app header visibility.

## Features

- ✅ **Two Modes**: Normal popup (685px) and expanded fullscreen mode
- ✅ **Preserves Header**: Expanded mode doesn't cover app header (90px default)
- ✅ **Clean Expanded View**: No backdrop/shadow in expanded mode for seamless integration
- ✅ **Instant Transition**: No animation when expanding for immediate feedback
- ✅ **Back Navigation**: Expanded mode shows back arrow icon in header for easy collapse
- ✅ **MUI Stack Spacing**: Uses MUI Stack component with configurable spacing prop (2=16px normal, 3=24px expanded)
- ✅ **Fully Customizable**: Override styles with `sx`, `contentSx`, `titleSx` props
- ✅ **Container Support**: Content container with configurable max-width
- ✅ **Type Safe**: Full TypeScript support
- ✅ **No Custom CSS**: Uses MUI `sx` prop pattern

## Basic Usage

```tsx
import { ResponsiveDialog } from "../../components/Dialog";
import { useState } from "react";

function MyComponent() {
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const actions = (
    <>
      {!showMore && (
        <Button onClick={() => setShowMore(true)}>Show More</Button>
      )}
      <Button onClick={() => setOpen(false)}>Close</Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={() => setOpen(false)}
      title="My Dialog"
      isExpanded={showMore}
      onExpandToggle={() => setShowMore(!showMore)}
      actions={actions}
    >
      <TextField label="Name" fullWidth />
      <TextField label="Email" fullWidth />
      {/* Wrapped in Stack with spacing={2} (normal) or spacing={3} (expanded) */}
    </ResponsiveDialog>
  );
}
```

## Props

| Prop                      | Type                  | Default   | Description                                                 |
| ------------------------- | --------------------- | --------- | ----------------------------------------------------------- |
| `open`                    | `boolean`             | required  | Whether dialog is open                                      |
| `onClose`                 | `() => void`          | required  | Close handler                                               |
| `title`                   | `string \| ReactNode` | required  | Dialog title (replaced by back icon when expanded)          |
| `children`                | `ReactNode`           | required  | Dialog content (wrapped in MUI Stack)                       |
| `actions`                 | `ReactNode`           | -         | Action buttons                                              |
| `isExpanded`              | `boolean`             | `false`   | Toggle fullscreen mode                                      |
| `onExpandToggle`          | `() => void`          | -         | Handler for back button click when expanded                 |
| `normalMaxWidth`          | `string`              | `"685px"` | Max width in normal mode                                    |
| `expandedContentMaxWidth` | `string`              | `"990px"` | Content container max-width in expanded mode                |
| `headerHeight`            | `string`              | `"90px"`  | App header height to preserve                               |
| `normalSpacing`           | `number`              | `2`       | Stack spacing in normal mode (MUI spacing units: 1 = 8px)   |
| `expandedSpacing`         | `number`              | `3`       | Stack spacing in expanded mode (MUI spacing units: 1 = 8px) |
| `contentSx`               | `SxProps<Theme>`      | -         | Custom styles for DialogContent                             |
| `titleSx`                 | `SxProps<Theme>`      | -         | Custom styles for DialogTitle                               |
| `dialogContentProps`      | `DialogContentProps`  | -         | Additional DialogContent props                              |
| `dialogTitleProps`        | `DialogTitleProps`    | -         | Additional DialogTitle props                                |
| `dividers`                | `boolean`             | `false`   | Show dividers between sections                              |

## Advanced Examples

### Custom Container Styles

```tsx
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Custom Styled Dialog"
  isExpanded={showMore}
  contentSx={{
    backgroundColor: "#f5f5f5",
    padding: 4,
  }}
  titleSx={{
    backgroundColor: "primary.main",
    color: "white",
  }}
>
  <TextField label="Field" />
</ResponsiveDialog>
```

### With Dividers

```tsx
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Dialog with Dividers"
  dividers={true}
  actions={<Button>Save</Button>}
>
  <TextField label="Content" />
</ResponsiveDialog>
```

### Different Sizes

```tsx
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Large Dialog"
  normalMaxWidth="900px"
  expandedContentMaxWidth="1200px"
>
  <TextField label="Content" />
</ResponsiveDialog>
```

### Custom Spacing

```tsx
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Custom Spacing"
  normalSpacing={1} // 8px spacing in normal mode
  expandedSpacing={4} // 32px spacing in expanded mode
>
  <TextField label="Field 1" />
  <TextField label="Field 2" />
  {/* MUI spacing units: 1=8px, 2=16px, 3=24px, 4=32px */}
</ResponsiveDialog>
```

### Custom Header Height

For apps with different header heights:

```tsx
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Custom Header Height"
  headerHeight="80px"
  isExpanded={true}
>
  <TextField label="Content" />
</ResponsiveDialog>
```

## Layout Behavior

### Normal Mode (`isExpanded={false}`)

- Dialog: max-width = `normalMaxWidth` (default 685px)
- Content: 100% width
- Height: auto (fits content)
- Position: centered with 32px margin
- Children spacing: `normalSpacing={2}` (16px via MUI Stack component)

### Expanded Mode (`isExpanded={true}`)

- Dialog: full width, height = `calc(100vh - headerHeight)`
- Content: max-width = `expandedContentMaxWidth` (default 990px), centered
- Position: top = `headerHeight` (preserves header visibility - default 90px)
- Backdrop: opacity = 0 (seamless integration with page)
- Shadow: removed (no elevation in expanded mode)
- Transition: disabled (instant expand/collapse for better UX)
- Title: replaced by back arrow IconButton (calls `onExpandToggle`)
- Children spacing: `expandedSpacing={3}` (24px via MUI Stack component)
- Actions (MuiBox): max-width = `expandedContentMaxWidth` (990px), centered container with buttons right-aligned
  - padding: 0 12px
  - width: 100%
  - justifyContent: flex-end

## Style Merging

All `sx` props are **merged** with base styles, not overridden:

```tsx
// Base styles are preserved, your styles are added
<ResponsiveDialog
  contentSx={{
    padding: 5, // Adds to base styles
  }}
>
```

## TypeScript Support

Full type inference and validation:

```tsx
import { ResponsiveDialog } from "../../components/Dialog";

// All props are type-checked
<ResponsiveDialog
  open={open}
  onClose={handleClose}
  title="Typed Dialog"
  // TypeScript will validate all props
>
```

## Best Practices

1. **Use `isExpanded` for Show More/Less**: Toggle between modes for better UX
2. **Provide `onExpandToggle` handler**: Required for back button functionality in expanded mode
3. **Hide expand button in actions when expanded**: Back arrow in header provides collapse action
4. **Keep `normalMaxWidth` reasonable**: 685px works well for forms
5. **Center content in expanded mode**: Default 990px provides good reading width
6. **Preserve header**: Default 90px - adjust via `headerHeight` prop if needed
7. **MUI Stack handles spacing**: Children wrapped in Stack with configurable spacing prop - override with `normalSpacing`/`expandedSpacing` if needed
8. **Seamless expanded mode**: No backdrop/shadow/transition creates clean integration with page
9. **Instant expand**: No animation when expanding provides immediate feedback
10. **Customize with `sx` props**: Avoid creating custom CSS files

## See Also

- `EventModal.tsx` - Real-world example usage
- MUI Dialog documentation: https://mui.com/material-ui/react-dialog/
