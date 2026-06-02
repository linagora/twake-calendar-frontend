import { CalendarPostBody } from '../CalendarDAO'
import { PostCalendarInput } from './makePostCalendarBody'

export function makeProppatchCalendarBody(
  input: PostCalendarInput
): CalendarPostBody {
  return JSON.stringify({
    'dav:name': input.name,
    'caldav:description': input.desc,
    'apple:color': input.color.light
  })
}
