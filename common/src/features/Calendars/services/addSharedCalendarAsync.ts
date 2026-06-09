import {
  calendarAction,
  fetchCalendars
} from '@common/features/Calendars/CalendarDAO'
import { makeAddSharedCalendarBody } from '@common/features/Calendars/transformers'
import { CalendarInput } from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'
import { getUserDetails } from '@common/features/User/userAPI'
import { Calendar } from '@common/types/CalendarTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const addSharedCalendarThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    {
      calId: string
      color: Record<string, string>
      link: string
      name: string
      desc: string
      delegated: boolean
      owner: OpenPaasUserData
    },
    { userId: string; calId: string; cal: CalendarInput },
    { rejectValue: RejectedError }
  >(
    async ({ userId, calId, cal }, { rejectWithValue }) => {
      try {
        const body = makeAddSharedCalendarBody(calId, cal)
        await calendarAction('POST', `/calendars/${userId}.json`, body)
        let ownerData: OpenPaasUserData = {
          firstname: '',
          lastname: cal.cal['dav:name'] ?? '',
          emails: []
        }
        try {
          ownerData = await getUserDetails(
            cal.cal._links.self.href
              .replace('/calendars/', '')
              .replace('.json', '')
              .split('/')[0]
          )
        } catch (e) {
          console.error('Error while fetching owner of shared calendar: ', e)
        }
        const calendars = await fetchCalendars(userId)
        const delegated = calendars._embedded['dav:calendar'].find(
          c => c['calendarserver:delegatedsource'] === cal.cal._links.self?.href
        )

        return {
          calId: cal.cal._links.self?.href
            ?.replace('/calendars/', '')
            .replace('.json', ''),
          color: cal.color,
          link:
            delegated?._links.self?.href ??
            `/calendars/${userId}/${calId}.json`,
          desc: cal.cal['caldav:description'] ?? '',
          name: cal.cal['dav:name'] ?? '',
          delegated: !!delegated,
          owner: ownerData
        }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: (state, action) => {
        state.pending = false
        state.list[action.payload.calId] = {
          color: action.payload.color,
          id: action.payload.calId,
          link: action.payload.link,
          description: action.payload.desc,
          delegated: action.payload.delegated,
          name: action.payload.name,
          events: {},
          owner: action.payload.owner
        } as Calendar
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          (action.payload as RejectedError)?.message ||
          action.error.message ||
          'Failed to add shared calendar'
      }
    }
  )
