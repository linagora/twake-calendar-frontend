import { CalendarPostBody } from '../CalendarDAO'

export interface ProppatchCalendarInput {
  name: string
  desc: string
  color: Record<string, string>
}

export function makeProppatchCalendarBody(
  input: ProppatchCalendarInput
): CalendarPostBody {
  return JSON.stringify({
    'dav:name': input.name,
    'caldav:description': input.desc,
    'apple:color': input.color.light
  })
}
