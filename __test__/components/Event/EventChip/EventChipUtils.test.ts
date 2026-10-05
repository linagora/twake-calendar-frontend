/**
 * @jest-environment jsdom
 */

import {
  getEffectiveColor,
  getHighContrastTextColor
} from '@common/components/Event/EventChip/EventChipUtils'
import { createTheme } from '@mui/material/styles'
import { Calendar } from '@common/types/CalendarTypes'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'

jest.mock('@common/utils/getAccessiblePair', () => ({
  getAccessiblePair: jest.fn((color: string) =>
    color === '#000000' ? '#ffffff' : '#000000'
  )
}))

jest.mock(
  '@injected/components/Attendees/AttendeeActions',
  () => ({
    AttendeeActions: () => null
  }),
  { virtual: true }
)

jest.mock('@common/components/Event/EventChip/EventChip', () => ({
  EVENT_DURATION: {
    SHORT: 15,
    MEDIUM: 30,
    LONG: 60
  }
}))

describe('getEffectiveColor', () => {
  const theme = createTheme()

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should apply correct color for event created from booking', () => {
    const bookingLinkColor = '#ff0000'
    const calendar = {
      color: { light: '#00ff00', dark: '#000000' }
    } as unknown as Calendar

    const result = getEffectiveColor(
      theme,
      calendar,
      undefined,
      bookingLinkColor
    )

    expect(result.light).toBe('#ff0000')
    expect(getAccessiblePair).toHaveBeenCalledWith('#ff0000', theme)
  })

  it('should fall back to calendar color if no booking link color or event colors are provided', () => {
    const calendar = {
      color: { light: '#00ff00', dark: '#000000' }
    } as unknown as Calendar

    const result = getEffectiveColor(theme, calendar)

    expect(result.light).toBe('#00ff00')
    expect(result.dark).toBe('#000000')
    expect(getAccessiblePair).not.toHaveBeenCalled()
  })
})

describe('getHighContrastTextColor', () => {
  it('writes dark on the light tint of a calendar', () => {
    expect(getHighContrastTextColor('#D0ECDA')).toBe('#1C1B1F')
  })

  it('writes white on a dark calendar colour', () => {
    expect(getHighContrastTextColor('#1A237E')).toBe('#FFFFFF')
  })

  it('reads a missing or translucent background as white', () => {
    expect(getHighContrastTextColor(undefined)).toBe('#1C1B1F')
    expect(getHighContrastTextColor('rgba(26, 35, 126, 0.1)')).toBe('#1C1B1F')
  })
})
