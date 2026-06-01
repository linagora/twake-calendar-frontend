import { User } from '@common/components/Attendees/types'
import { calendarAction } from '@common/features/Calendars/CalendarDAO'
import { makeAddSharedCalendarBody } from '@common/features/Calendars/transformers'
import { CalendarInput } from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'
import { Calendar } from '@common/types/CalendarTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'
import { fetchOwnerOfResource } from './helpers'

export const addCalendarResourceThunk = (
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
    {
      userId: string
      calId: string
      cal: Omit<CalendarInput, 'owner'> & {
        owner?: Omit<User, 'email'> & { email?: string }
      }
    },
    { rejectValue: RejectedError }
  >(
    async ({ userId, calId, cal }, { rejectWithValue }) => {
      const resourceId = cal.cal._links.self?.href
        ?.replace('/calendars/', '')
        ?.replace('.json', '')
        ?.split('/')[0]

      let owner: OpenPaasUserData = {
        firstname: '',
        lastname: cal.cal['dav:name'] ?? '',
        emails: [],
        resource: true
      }
      try {
        const body = makeAddSharedCalendarBody(calId, cal)
        await calendarAction('POST', `/calendars/${userId}.json`, body)

        if (resourceId) {
          try {
            owner = {
              ...(await fetchOwnerOfResource(resourceId)),
              resource: true
            }
          } catch (e) {
            console.error('Error while fetching owner of resource: ', e)
          }
        }

        return {
          calId: cal.cal._links.self?.href
            ?.replace('/calendars/', '')
            .replace('.json', ''),
          color: cal.color,
          link: `/calendars/${userId}/${calId}.json`,
          desc: cal.cal['caldav:description'] ?? '',
          name: cal.cal['dav:name'] ?? '',
          owner
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
          (action.payload as RejectedError).message ||
          action.error.message ||
          'Failed to add calendar resource'
      }
    }
  )
