import { User } from '@/components/Attendees/types'
import { getCalendarVisibility } from '@/components/Calendar/utils/calendarUtils'
import { formatReduxError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { fetchCalendars } from '../CalendarDAO'
import { Calendar } from '../CalendarTypes'
import { RejectedError } from '../types/RejectedError'
import { CalendarData, CalendarList } from '../types/CalendarData'
import { getOwnerOrResourceData } from './helpers'

export const getTempCalendarsListAsync = createAsyncThunk<
  Record<string, Calendar>,
  User,
  { rejectValue: RejectedError }
>('calendars/getTempCalendars', async (tempUser, { rejectWithValue }) => {
  try {
    const openpaasId = getValidOpenPaasId(tempUser)
    const calendars = await fetchCalendars(openpaasId, 'sharedPublic=true&')
    const rawCalendars = getRawCalendars(calendars, tempUser)

    const importedCalendars: Record<string, Calendar> = {}
    for (const cal of rawCalendars) {
      const tempCal = await processTempCalendar(cal, tempUser)
      importedCalendars[tempCal.id] = tempCal
    }

    return importedCalendars
  } catch (err) {
    const error = err as { response?: { status?: number } }
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status
    })
  }
})

function getValidOpenPaasId(tempUser: User): string {
  if (!tempUser.openpaasId) {
    const username = tempUser.displayName || tempUser.email || 'User'
    throw new Error(
      `TRANSLATION:calendar.userDoesNotHaveValidId|name=${encodeURIComponent(username)}`
    )
  }
  return tempUser.openpaasId
}

function getRawCalendars(
  calendars: CalendarList,
  tempUser: User
): CalendarData[] {
  const rawCalendars = calendars._embedded?.['dav:calendar']
  if (!rawCalendars || rawCalendars.length === 0) {
    const userName = tempUser.displayName || tempUser.email || 'User'
    const encodedName = encodeURIComponent(userName)
    throw new Error(
      `TRANSLATION:calendar.userDoesNotHavePublicCalendars|name=${encodedName}`
    )
  }
  return rawCalendars
}

function getCalendarSource(cal: CalendarData): string {
  const source = cal['calendarserver:source']
    ? cal['calendarserver:source']._links.self?.href
    : cal._links.self?.href
  if (!source) {
    throw new Error('No source for calendar')
  }
  return source
}

function getCalendarColor(tempUser: User): { light: string; dark: string } {
  return {
    light: tempUser.color?.light ?? '#a8a8a8ff',
    dark: tempUser.color?.dark ?? '#a8a8a8ff'
  }
}

async function processTempCalendar(
  cal: CalendarData,
  tempUser: User
): Promise<Calendar> {
  const source = getCalendarSource(cal)
  const id = source.replace('/calendars/', '').replace('.json', '')
  const isResource = tempUser.objectType === 'resource'
  const ownerData = await getOwnerOrResourceData(id.split('/')[0], isResource)

  return {
    id,
    name: cal['dav:name'] ?? '',
    link: cal._links.self?.href ?? '',
    owner: ownerData,
    description: cal['caldav:description'] ?? '',
    delegated: !!cal['calendarserver:delegatedsource'],
    color: getCalendarColor(tempUser),
    visibility: getCalendarVisibility(cal['acl'] ?? []),
    events: {}
  }
}
