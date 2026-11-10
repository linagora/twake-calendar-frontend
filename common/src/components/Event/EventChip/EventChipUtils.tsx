import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { Calendar } from '@common/types/CalendarTypes'
import { EventDisplayInfo } from '@fullcalendar/react'
import {
  Theme,
  alpha,
  decomposeColor,
  getContrastRatio,
  getLuminance,
  lighten
} from '@linagora/twake-mui'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import CancelIcon from '@mui/icons-material/Cancel'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import moment from 'moment'
import React, { useLayoutEffect, useState } from 'react'
import { EVENT_DURATION } from './EventChip'

const COMPACT_WIDTH_THRESHOLD = 100
const MIN_UI_CONTRAST = 3

export interface EventChipProps {
  arg: EventDisplayInfo
  calendars?: Record<string, Calendar>
  tempcalendars?: Record<string, Calendar>
  errorHandler: EventErrorHandler
}
export interface IconDisplayConfig {
  declined: boolean
  tentative: boolean
  needAction: boolean
  private: boolean
}
export function getEventDuration(event: EventDisplayInfo['event']): number {
  return moment(event._instance?.range.end).diff(
    moment(event._instance?.range.start),
    'minutes'
  )
}
export function getBestColor(
  colors: { light: string; dark: string },
  background = '#fff'
): string {
  if (!colors?.light || !colors?.dark) return colors?.light ?? colors?.dark
  try {
    const best = pickBestColor(colors, background)
    return getLuminance(background) < 0.5
      ? lightenToContrast(best, background)
      : best
  } catch {
    return colors.light
  }
}

function pickBestColor(
  colors: { light: string; dark: string },
  background: string
): string {
  // getAccessiblePair falls back to white or black when it finds no tinted
  // pair: keep the calendar's hue rather than a colorless variant
  if (isColorless(colors.dark) !== isColorless(colors.light)) {
    return isColorless(colors.dark) ? colors.light : colors.dark
  }
  const contrastToDark = getContrastRatio(colors.dark, background)
  const contrastToLight = getContrastRatio(colors.light, background)
  return contrastToDark > contrastToLight ? colors.dark : colors.light
}

// On a dark background, lighten the color until it reaches the 3:1 contrast
// that WCAG asks of UI components, keeping its hue
function lightenToContrast(color: string, background: string): string {
  let lightened = color
  for (
    let coefficient = 0.1;
    getContrastRatio(lightened, background) < MIN_UI_CONTRAST &&
    coefficient < 1;
    coefficient += 0.1
  ) {
    lightened = lighten(color, coefficient)
  }
  return lightened
}

function isColorless(color: string): boolean {
  const [r, g, b] = decomposeColor(color).values
  return Math.max(r, g, b) - Math.min(r, g, b) < 16
}

export function getEventTimes(
  event: EventDisplayInfo['event'],
  timeZone: string
): {
  startTime: string
  endTime: string | null
} {
  // FullCalendar drops an end that is not after the start (DTEND before
  // DTSTART, accepted by the server): such events show their start only
  const hasEnd = !!event.end && !!event.start && event.end > event.start
  return {
    startTime: moment.tz(event.start, timeZone).format('HH:mm'),
    endTime: hasEnd ? moment.tz(event.end, timeZone).format('HH:mm') : null
  }
}
export function getEffectiveColor(
  theme: Theme,
  calendar?: Calendar,
  eventColors?: Record<string, string> | string,
  bookingLinkColor?: string
): { light: string; dark: string } {
  if (bookingLinkColor) {
    return {
      light: bookingLinkColor,
      dark: getAccessiblePair(bookingLinkColor, theme)
    }
  }

  if (eventColors) {
    if (typeof eventColors === 'string') {
      return { light: eventColors, dark: getAccessiblePair(eventColors, theme) }
    }
    if (eventColors.light || eventColors.dark) {
      const light = eventColors.light || eventColors.dark || '#fff'
      return {
        light,
        dark: eventColors.dark || getAccessiblePair(light, theme)
      }
    }
    // If it's a record with other keys (like booking color), take the first string value
    const values = Object.values(eventColors).filter(v => typeof v === 'string')
    if (values.length > 0) {
      return { light: values[0], dark: getAccessiblePair(values[0], theme) }
    }
  }

  return (
    (calendar?.color as { light: string; dark: string }) ?? {
      light: '#fff',
      dark: '#000'
    }
  )
}

export function getTitleStyle(
  bestColor: string,
  partstat?: string,
  effectiveColor?: { light: string; dark: string },
  isPrivate?: boolean
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontWeight: '500',
    fontStyle: 'Medium',
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.5px',
    verticalAlign: 'middle',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: bestColor
  }

  switch (partstat) {
    case 'DECLINED':
      return { ...baseStyle, textDecoration: 'line-through' }
    case 'TENTATIVE':
      return baseStyle
    case 'ACCEPTED':
      return { ...baseStyle, color: effectiveColor?.dark }
    case 'NEEDS-ACTION':
      return baseStyle
    default:
      if (isPrivate) {
        return { ...baseStyle, color: effectiveColor?.dark }
      }
      return baseStyle
  }
}

function getEventVariant(
  duration: number
): 'short' | 'medium' | 'long' | 'extraLong' {
  if (duration <= EVENT_DURATION.SHORT) return 'short'
  if (duration <= EVENT_DURATION.MEDIUM) return 'medium'
  if (duration <= EVENT_DURATION.LONG) return 'long'
  return 'extraLong'
}

function getCardVariantStyle(
  variant: string,
  baseColor: string
): React.CSSProperties {
  const shared: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    boxShadow: 'none',
    border: `1px solid ${baseColor}`,
    color: baseColor,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    cursor: 'pointer'
  }

  switch (variant) {
    case 'short':
      return { ...shared, padding: '0px 6px', justifyContent: 'center' }
    case 'medium':
      return { ...shared, padding: '4px 6px', justifyContent: 'center' }
    default:
      return {
        ...shared,
        padding: '4px 6px'
      }
  }
}

export function getCardStyle(
  bestColor: string,
  eventLength: number,
  partstat?: string,
  effectiveColor?: { light: string; dark: string },
  isPrivate?: boolean
): React.CSSProperties {
  const baseStyle: React.CSSProperties = getCardVariantStyle(
    getEventVariant(eventLength),
    bestColor
  )

  switch (partstat) {
    case 'DECLINED':
      return baseStyle
    case 'TENTATIVE':
      return {
        ...baseStyle,
        border: '1px dashed'
      }
    case 'NEEDS-ACTION':
      return {
        ...baseStyle,
        backgroundColor: '#fff'
      }
    case 'ACCEPTED':
      return {
        ...baseStyle,
        backgroundColor: effectiveColor?.light,
        color: effectiveColor?.dark,
        border: '1px solid white'
      }
    case 'BOOKING':
      return {
        ...baseStyle,
        backgroundColor: alpha(bestColor, 0.1),
        border: '1px solid white',
        padding: '0px',
        borderRadius: '4px'
      }
    default:
      if (isPrivate) {
        return {
          ...baseStyle,
          backgroundColor: effectiveColor?.light,
          color: effectiveColor?.dark,
          border: '1px solid white'
        }
      }
      return baseStyle
  }
}

export function DisplayedIcons(
  IconDisplayed: IconDisplayConfig,
  iconColor?: string
): React.ReactNode {
  if (!Object.values(IconDisplayed).find(b => b === true)) return
  const iconStyle: React.CSSProperties = {
    fontSize: '15px',
    color: iconColor || 'inherit',
    marginRight: 2
  }
  return (
    <span
      className="event-chip-icons"
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        gap: '1px',
        color: iconColor || 'inherit',
        margin: 0,
        marginRight: '4px',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        letterSpacing: 'inherit'
      }}
    >
      {IconDisplayed.needAction && (
        <HelpOutlineOutlinedIcon style={iconStyle} />
      )}
      {IconDisplayed.declined && <CancelIcon style={iconStyle} />}
      {IconDisplayed.tentative && <HelpOutlineOutlinedIcon style={iconStyle} />}
      {IconDisplayed.private && <LockOutlinedIcon style={iconStyle} />}
    </span>
  )
}

export function useCompactMode(
  cardRef: React.RefObject<HTMLDivElement | null>
): boolean {
  const [showCompact, setShowCompact] = useState(false)

  useLayoutEffect(() => {
    if (!cardRef.current) return

    const checkWidth = (): void => {
      const width = cardRef.current?.offsetWidth ?? 0
      const newCompact = width < COMPACT_WIDTH_THRESHOLD

      setShowCompact(prev => (prev !== newCompact ? newCompact : prev))
    }

    checkWidth()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(checkWidth)
    })

    resizeObserver.observe(cardRef.current)

    return (): void => resizeObserver.disconnect()
  }, [cardRef])

  return showCompact
}
