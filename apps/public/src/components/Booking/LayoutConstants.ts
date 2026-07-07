// BookingLayoutConstants.ts

export const getLayoutConstants = (
  isMobile: boolean
): {
  CELL_SIZE: number
  WEEK_ROWS: number
  ROW_GAP: number
  WEEKDAY_LABEL_HEIGHT: number
  CALENDAR_GRID_HEIGHT: number
  CALENDAR_HEADER_HEIGHT: number
  SECTION_PADDING: number
  CALENDAR_CONTENT_HEIGHT: number
} => {
  const CELL_SIZE = isMobile ? 40 : 66
  const WEEK_ROWS = 6
  const ROW_GAP = 6 // vertical gap between week rows
  const WEEKDAY_LABEL_HEIGHT = CELL_SIZE
  const CALENDAR_GRID_HEIGHT = (CELL_SIZE + ROW_GAP) * WEEK_ROWS
  const CALENDAR_HEADER_HEIGHT = 32 // see figma
  const SECTION_PADDING = 24

  // Total height of the calendar's own content (header + weekday labels + grid),
  // used to size the sibling time-slot column to match.
  const CALENDAR_CONTENT_HEIGHT =
    CALENDAR_HEADER_HEIGHT + WEEKDAY_LABEL_HEIGHT + CALENDAR_GRID_HEIGHT

  return {
    CELL_SIZE,
    WEEK_ROWS,
    ROW_GAP,
    WEEKDAY_LABEL_HEIGHT,
    CALENDAR_GRID_HEIGHT,
    CALENDAR_HEADER_HEIGHT,
    SECTION_PADDING,
    CALENDAR_CONTENT_HEIGHT
  }
}
