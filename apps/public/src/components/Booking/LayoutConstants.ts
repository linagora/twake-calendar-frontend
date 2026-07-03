// BookingLayoutConstants.ts
export const CELL_SIZE = 66
export const WEEK_ROWS = 6
export const WEEKDAY_LABEL_HEIGHT = CELL_SIZE
export const CALENDAR_GRID_HEIGHT = CELL_SIZE * WEEK_ROWS
export const CALENDAR_HEADER_HEIGHT = 40 // measure actual MuiPickersCalendarHeader-root height in devtools, adjust
export const SECTION_PADDING = 24 // matches p: '24px' on both sections

// Total height of the calendar's own content (header + weekday labels + grid),
// used to size the sibling time-slot column to match.
export const CALENDAR_CONTENT_HEIGHT =
  CALENDAR_HEADER_HEIGHT + WEEKDAY_LABEL_HEIGHT + CALENDAR_GRID_HEIGHT
