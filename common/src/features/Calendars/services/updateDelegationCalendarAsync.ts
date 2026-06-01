import { toRejectedError } from '@common/utils/errorUtils'
import { updateDelegationCalendar } from '@common/features/Calendars/CalendarDAO'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const updateDelegationCalendarThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    {
      calId: string
      calLink: string
    },
    {
      calId: string
      calLink: string
      share: {
        set: { [x: string]: string | boolean; 'dav:href': string }[]
        remove: { [x: string]: string | boolean; 'dav:href': string }[]
      }
    },
    { rejectValue: RejectedError }
  >(async ({ calId, calLink, share }, { rejectWithValue }) => {
    try {
      await updateDelegationCalendar(calLink, share)
      return {
        calId,
        calLink
      }
    } catch (err) {
      return rejectWithValue(toRejectedError(err))
    }
  })
