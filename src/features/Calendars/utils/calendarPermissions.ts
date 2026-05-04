import { Calendar } from '@/features/Calendars/CalendarTypes'

export function canWriteToCalendar(cal: Calendar, userId: string): boolean {
  if (!cal) return false

  const isOwner = cal.id?.split('/')[0] === userId
  const hasDelegatedWrite = !!(cal.delegated && cal.access?.write)

  return isOwner || hasDelegatedWrite
}
