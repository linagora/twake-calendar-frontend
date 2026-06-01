import { calendarAction } from '@common/features/Calendars/CalendarDAO'
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
      owner: OpenPaasUserData
    },
    { userId: string; calId: string; cal: CalendarInput },
    { rejectValue: RejectedError }
  >(
    async ({ userId, calId, cal }, { rejectWithValue }) => {
      try {
        const body = makeAddSharedCalendarBody(calId, cal)
        await calendarAction('POST', `/calendars/${userId}.json`, body)
        const ownerData = await getUserDetails(
          cal.cal._links.self.href
            .replace('/calendars/', '')
            .replace('.json', '')
            .split('/')[0]
        )

        return {
          calId: cal.cal._links.self?.href
            ?.replace('/calendars/', '')
            .replace('.json', ''),
          color: cal.color,
          link: `/calendars/${userId}/${calId}.json`,
          desc: cal.cal['caldav:description'] ?? '',
          name: cal.cal['dav:name'] ?? '',
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
      settled: state => {
        state.pending = false
      },
      fulfilled: (state, action) => {
        state.list[action.payload.calId] = {
          color: action.payload.color,
          id: action.payload.calId,
          link: action.payload.link,
          description: action.payload.desc,
          name: action.payload.name,
          events: {},
          owner: action.payload.owner
        } as Calendar
        state.error = null
      },
      rejected: (state, action) => {
        state.error =
          (action.payload as Error)?.message ||
          action.error.message ||
          'Failed to add shared calendar'
      }
    }
  )
