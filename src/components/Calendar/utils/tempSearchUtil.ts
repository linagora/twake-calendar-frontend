import { User } from '@/components/Attendees/types'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { defaultColors } from '@/utils/defaultColors'

export interface SearchState {
  query?: string
  options?: User[]
  loading?: boolean
}

export function buildEmailToCalendarMap(
  calRecord: Record<string, Calendar>
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [id, cal] of Object.entries(calRecord)) {
    cal.owner?.emails?.forEach(email => {
      const existing = map.get(email)
      if (existing) {
        existing.push(id)
      } else {
        map.set(email, [id])
      }
    })
  }
  return map
}

function shiftLightness(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const clamp = (v: number): number => Math.max(0, Math.min(255, v))
  const toHex = (v: number): string =>
    clamp(v + amount)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function generateDistinctColor(usedLights: string[]): {
  light: string
  dark: string
} {
  for (const color of defaultColors) {
    if (!usedLights.includes(color.light)) return color
  }

  const cycle = usedLights.length % defaultColors.length
  const round = Math.floor(usedLights.length / defaultColors.length)
  const base = defaultColors[cycle]

  return {
    light: shiftLightness(base.light, round * 12),
    dark: shiftLightness(base.dark, -(round * 10))
  }
}
