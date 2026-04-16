import { useMemo } from 'react'

export const LAYOUT_MODE = {
  EXPANDED: 'expanded',
  ALL_DAY: 'allday',
  COMPACT: 'compact'
} as const

export type LayoutMode = (typeof LAYOUT_MODE)[keyof typeof LAYOUT_MODE]

export interface DateTimeLayoutProps {
  hasEndDateChanged: boolean
  allday: boolean
  spansMultipleDays: boolean
  showMore: boolean
  showEndDate: boolean
}

export function useDateTimeLayout({
  hasEndDateChanged,
  allday,
  spansMultipleDays,
  showMore,
  showEndDate
}: DateTimeLayoutProps): LayoutMode {
  return useMemo(() => {
    const isSpecialRange = hasEndDateChanged || spansMultipleDays
    if (!allday && (showMore || isSpecialRange)) {
      return LAYOUT_MODE.EXPANDED
    }
    if (allday || showEndDate) return LAYOUT_MODE.ALL_DAY
    return LAYOUT_MODE.COMPACT
  }, [hasEndDateChanged, allday, spansMultipleDays, showMore, showEndDate])
}
