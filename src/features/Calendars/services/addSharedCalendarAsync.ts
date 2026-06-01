import { OpenPaasUserData } from '@/features/User/type/OpenPaasUserData'
import { getUserDetails } from '@/features/User/userAPI'
import { toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { calendarAction } from '../CalendarDAO'
import { makeAddSharedCalendarBody } from '../transformers'
import { CalendarInput } from '../types/CalendarData'
import { RejectedError } from '../types/RejectedError'

export const addSharedCalendarAsync = createAsyncThunk<
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
  'calendars/addSharedCalendar',
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
  }
)
