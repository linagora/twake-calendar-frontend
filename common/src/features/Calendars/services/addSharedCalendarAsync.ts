import { getCalendarDelegationAccess } from '@common/components/Calendar/utils/calendarUtils'
import {
  calendarAction,
  fetchCalendars
} from '@common/features/Calendars/CalendarDAO'
import { makeAddSharedCalendarBody } from '@common/features/Calendars/transformers'
import { CalendarInput } from '@common/features/Calendars/types/CalendarData'
import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { CalDavLink } from '@common/features/Calendars/types/CalendarApiTypes'
import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'
import { fetchUserById } from '@common/features/User/UserDao'
import { Calendar, DelegationAccess } from '@common/types/CalendarTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import {
  AsyncThunkConfig,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  AsyncThunkReducers,
  ReducerCreators,
  ReducerType
} from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

type AsyncThunkSliceReducerDefinition<
  State,
  ThunkArg,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = AsyncThunkConfig
> = AsyncThunkReducers<State, ThunkArg, Returned, ThunkApiConfig> & {
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
} & {
  _reducerDefinitionType: ReducerType.asyncThunk
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>
}

export const addSharedCalendarThunk = (
  create: ReducerCreators<CalendarState>
): AsyncThunkSliceReducerDefinition<
  CalendarState,
  { userId: string; calId: string; cal: CalendarInput },
  {
    calId: string
    color: Record<string, string>
    link: string
    name: string
    desc: string
    delegated: boolean
    owner: OpenPaasUserData
    access?: DelegationAccess
  },
  { rejectValue: RejectedError }
> =>
  create.asyncThunk<
    {
      calId: string
      color: Record<string, string>
      link: string
      name: string
      desc: string
      delegated: boolean
      owner: OpenPaasUserData
      access?: DelegationAccess
    },
    { userId: string; calId: string; cal: CalendarInput },
    { rejectValue: RejectedError }
  >(
    async ({ userId, calId, cal }, { rejectWithValue }) => {
      // Validate calendar ID before any server mutations
      const resultCalId = new CalDavLink(cal.cal._links).parseCalendarId()
      if (!resultCalId) {
        return rejectWithValue({
          message: 'Invalid calendar ID',
          status: 400
        } as RejectedError)
      }

      try {
        const body = makeAddSharedCalendarBody(calId, cal)
        await calendarAction('POST', `/calendars/${userId}.json`, body)
        let ownerData: OpenPaasUserData = {
          id: userId,
          firstname: '',
          lastname: cal.cal['dav:name'] ?? '',
          emails: []
        }
        try {
          ownerData = await fetchUserById(resultCalId.split('/')[0])
        } catch (e) {
          console.error('Error while fetching owner of shared calendar: ', e)
        }
        const calendars = await fetchCalendars(userId)
        const delegated = calendars._embedded['dav:calendar'].find(
          c => c['calendarserver:delegatedsource'] === cal.cal._links.self?.href
        )
        const access = getCalendarDelegationAccess(
          delegated ? (delegated['acl'] ?? []) : (cal.cal['acl'] ?? []),
          userId
        )

        return {
          calId: new CalDavLink(cal.cal._links).parseCalendarId() ?? calId,
          color: cal.color,
          link:
            delegated?._links.self?.href ??
            `/calendars/${userId}/${calId}.json`,
          desc: cal.cal['caldav:description'] ?? '',
          name: cal.cal['dav:name'] ?? '',
          delegated: !!delegated,
          owner: ownerData,
          access
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
          owner: action.payload.owner,
          access: action.payload.access
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
