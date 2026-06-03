import { RootState } from '@/app/store'
import { OpenPaasUserData } from '@/features/User/type/OpenPaasUserData'
import { getOpenPaasUser } from '@/features/User/userAPI'
import { defaultColors } from '@/utils/defaultColors'
import { formatReduxError, toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { fetchCalendars } from '../CalendarDAO'
import { Calendar, CalendarInvite, DelegationAccess } from '../CalendarTypes'
import { CalendarData } from '../types/CalendarData'
import { RejectedError } from '../types/RejectedError'
import { normalizeCalendar } from '../utils/normalizeCalendar'
import { getOwnerOrResourceData, extractResourceOwnerIds } from './helpers'
import { createTheme } from '@mui/material/styles'
import { getAccessiblePair } from '@/utils/getAccessiblePair'

const theme = createTheme()

export const getCalendarsListAsync = createAsyncThunk<
  { importedCalendars: Record<string, Calendar>; errors: string },
  void,
  { rejectValue: RejectedError; state: RootState }
>('calendars/getCalendars', async (_, { rejectWithValue, getState }) => {
  const state = getState()
  const existingCalendars = state.calendars.list || {}
  const existingUser = { id: state.user?.userData?.openpaasId || undefined }
  try {
    const user = existingUser.id ? existingUser : await getOpenPaasUser()
    const calendars = await fetchCalendars(user.id as string)
    const rawCalendars = calendars._embedded['dav:calendar']

    const errors: string[] = []

    const normalizedCalendars = rawCalendars.map((cal: CalendarData) =>
      normalizeCalendar(cal, user.id as string)
    )

    const ownerDataMap = await fetchCalendarsOwnerData(
      normalizedCalendars,
      errors
    )

    const fetchedCalendars = buildFetchedCalendars(
      normalizedCalendars,
      ownerDataMap
    )

    const importedCalendars = mergeCalendars(
      fetchedCalendars,
      existingCalendars
    )

    return {
      importedCalendars,
      errors: errors.join('\n')
    }
  } catch (err) {
    return rejectWithValue(toRejectedError(err))
  }
})

async function fetchCalendarsOwnerData(
  normalizedCalendars: Array<{ cal: CalendarData; ownerId: string }>,
  errors: string[]
): Promise<Map<string, OpenPaasUserData>> {
  const resourceOwnerIds = extractResourceOwnerIds(normalizedCalendars)
  const uniqueOwnerIds = Array.from(
    new Set(normalizedCalendars.map(({ ownerId }) => ownerId).filter(Boolean))
  )

  const ownerDataMap = new Map<string, OpenPaasUserData>()
  const OWNER_BATCH_SIZE = 20

  const mapOwnerData = async (ownerId: string): Promise<void> => {
    const isResource = resourceOwnerIds.has(ownerId)
    try {
      const data = await getOwnerOrResourceData(ownerId, isResource)
      ownerDataMap.set(ownerId, data)
    } catch (error) {
      console.error(
        `Failed to fetch ${
          isResource ? 'resource' : 'user'
        } details for ${ownerId}:`,
        error
      )
      ownerDataMap.set(ownerId, {
        firstname: '',
        lastname: 'Unknown User',
        emails: []
      })
      errors.push(formatReduxError(error))
    }
  }

  for (let i = 0; i < uniqueOwnerIds.length; i += OWNER_BATCH_SIZE) {
    const chunk = uniqueOwnerIds.slice(i, i + OWNER_BATCH_SIZE)
    await Promise.all(chunk.map(ownerId => mapOwnerData(ownerId)))
  }

  return ownerDataMap
}

function buildFetchedCalendars(
  normalizedCalendars: Array<{
    cal: CalendarData
    description?: string
    delegated: boolean
    link?: string
    id: string
    ownerId: string
    visibility: 'private' | 'public'
    access?: DelegationAccess
  }>,
  ownerDataMap: Map<string, OpenPaasUserData>
): Record<string, Calendar> {
  const fetchedCalendars: Record<string, Calendar> = {}

  normalizedCalendars.forEach(
    ({
      cal,
      description,
      delegated,
      link,
      id,
      ownerId,
      visibility,
      access
    }) => {
      const ownerData = ownerDataMap.get(ownerId) || {
        firstname: '',
        lastname: 'Unknown User',
        emails: []
      }

      const rawColor = cal['apple:color']
      const color = rawColor
        ? {
            light: rawColor,
            dark: getAccessiblePair(rawColor, theme)
          }
        : defaultColors[0]

      const invite: CalendarInvite[] = (
        (cal.invite ?? []) as Array<{
          href: string
          principal: string
          access: number
          inviteStatus: number
        }>
      ).filter((inv): inv is CalendarInvite => [2, 3, 5].includes(inv.access))

      fetchedCalendars[id] = {
        id,
        name: cal['dav:name'] ?? '',
        link: link ?? '',
        owner: ownerData,
        description,
        delegated,
        color,
        visibility,
        access,
        events: {},
        invite
      }
    }
  )

  return fetchedCalendars
}

function mergeCalendars(
  fetchedCalendars: Record<string, Calendar>,
  existingCalendars: Record<string, Calendar>
): Record<string, Calendar> {
  const importedCalendars: Record<string, Calendar> = {}

  const fetchedIds = new Set(Object.keys(fetchedCalendars))
  const existingIds = new Set(Object.keys(existingCalendars))

  const added = [...fetchedIds].filter(id => !existingIds.has(id))

  existingIds.forEach(id => {
    if (fetchedIds.has(id)) {
      const existingCal = existingCalendars[id]
      const fetchedCal = fetchedCalendars[id]

      if (fetchedCal) {
        importedCalendars[id] = {
          ...fetchedCal,
          events: existingCal.events || {}
        }
      }
    }
  })

  // Add new calendars
  added.forEach(id => {
    importedCalendars[id] = fetchedCalendars[id]
  })

  return importedCalendars
}
