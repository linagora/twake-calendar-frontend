import { CalendarPostBody } from '../CalendarDAO'

export interface PostCalendarInput {
  calId: string
  color: Record<string, string>
  name: string
  desc: string
}

export function makePostCalendarBody(
  input: PostCalendarInput
): CalendarPostBody {
  return JSON.stringify({
    id: input.calId,
    'dav:name': input.name,
    'apple:color': input.color.light,
    'caldav:description': input.desc
  })
}
