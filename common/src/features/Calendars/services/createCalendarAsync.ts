import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'
import { userData } from '@common/features/User/userDataTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { calendarAction } from '@common/features/Calendars/CalendarDAO'
import { makePostCalendarBody } from '@common/features/Calendars/transformers'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'

export const createCalendarThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    {
      userId: string
      calId: string
      color: Record<string, string>
      name: string
      desc: string
      owner: OpenPaasUserData
    },
    {
      userData: userData
      calId: string
      color: Record<string, string>
      name: string
      desc: string
    },
    { rejectValue: RejectedError }
  >(
    async ({ userData, calId, color, name, desc }, { rejectWithValue }) => {
      try {
        if (!userData.openpaasId) {
          throw new Error('No openpaasId')
        }

        const body = makePostCalendarBody({ calId, color, name, desc })
        await calendarAction(
          'POST',
          `/calendars/${userData.openpaasId}.json`,
          body
        )

        return {
          userId: userData.openpaasId,
          calId,
          color,
          name,
          desc,
          owner: {
            firstname: userData.given_name,
            lastname: userData.family_name,
            id: userData.openpaasId,
            preferredEmail: userData.email,
            emails: userData.email ? [userData.email] : []
          }
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
        state.list[`${action.payload.userId}/${action.payload.calId}`] = {
          color: action.payload.color,
          id: `${action.payload.userId}/${action.payload.calId}`,
          link: `/calendars/${action.payload.userId}/${action.payload.calId}.json`,
          description: action.payload.desc,
          name: action.payload.name,
          owner: action.payload.owner,
          events: {}
        } as Calendar
        state.error = null
      },
      rejected: (state, action) => {
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to create calendar'
      }
    }
  )
