import { User } from '@common/components/Attendees/types'
import { getCalendarVisibility } from '@common/components/Calendar/utils/calendarUtils'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
import {
  CalendarData,
  CalendarList
} from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { Calendar } from '@common/types/CalendarTypes'
import { formatReduxError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'
import { getOwnerOrResourceData } from './helpers'
import { CalDavLink } from '@common/features/Calendars/types/CalendarApiTypes'
import { defaultColors } from '@common/utils/defaultColors'

export const getTempCalendarsListThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    Record<string, Calendar>,
    User,
    { rejectValue: RejectedError }
  >(
    async (tempUser, { rejectWithValue }) => {
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
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: (state, action) => {
        state.pending = false
        Object.keys(action.payload).forEach(
          id => (state.templist[id] = action.payload[id])
        )
      },
      rejected: (state, action) => {
        state.pending = false
        if (
          action.payload?.message?.includes('aborted') ||
          action.error.name === 'AbortError'
        ) {
          return
        }
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to load temporary calendars'
      }
    }
  )

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
    light: tempUser.color?.light ?? defaultColors[0].light,
    dark: tempUser.color?.dark ?? defaultColors[0].dark
  }
}

async function processTempCalendar(
  cal: CalendarData,
  tempUser: User
): Promise<Calendar> {
  const source = getCalendarSource(cal)
  const id = CalDavLink.parseCalendarIdFromHref(source)
  if (!id) {
    throw new Error('Invalid calendar source')
  }
  const isResource = tempUser.objectType === 'resource'
  const ownerData = await getOwnerOrResourceData(
    CalDavLink.getFirstIdFromHref(source) ?? '',
    isResource
  )

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
