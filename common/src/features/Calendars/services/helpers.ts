import { CalendarData } from '@common/features/Calendars/types/CalendarData'
import { fetchResourceById } from '@common/features/User/ResourceDAO'
import { makeResourceToUserData } from '@common/features/User/transformers'
import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'
import { fetchUserById } from '@common/features/User/UserDao'
import { CalendarInvite } from '@common/types/CalendarTypes'

export const fetchOwnerOfResource = async (
  resourceId: string
): Promise<OpenPaasUserData> => {
  try {
    const data = await fetchResourceById(resourceId)
    const ownerData = await fetchUserById(data.creator)
    const { owner, resourceIcon } = makeResourceToUserData(data, ownerData)
    return {
      ...owner,
      resourceIcon
    }
  } catch (error) {
    console.error(`Failed to fetch resource details for ${resourceId}:`, error)
    throw error
  }
}

export const fetchOwnerData = async (
  ownerId: string
): Promise<OpenPaasUserData> => {
  try {
    const owner = await fetchUserById(ownerId)
    return owner
  } catch (error) {
    console.error(`Failed to fetch user details for ${ownerId}:`, error)
    throw error
  }
}

export function isResourceCalendar(cal: CalendarData): boolean {
  return (
    (cal.invite ??
      (
        cal['calendarserver:source'] as unknown as {
          invite: CalendarInvite[]
        }
      )?.invite ??
      []) as Array<{
      href: string
      access: number
    }>
  ).some(inv => inv.access === 1 && inv.href?.includes('principals/resources'))
}

export function extractResourceOwnerIds(
  normalizedCalendars: Array<{ cal: CalendarData; ownerId?: string }>
): Set<string> {
  const resourceOwnerIds = new Set<string>()
  normalizedCalendars.forEach(({ cal, ownerId }) => {
    if (isResourceCalendar(cal) && ownerId) {
      resourceOwnerIds.add(ownerId)
    }
  })
  return resourceOwnerIds
}

export async function getOwnerOrResourceData(
  ownerId: string,
  isResource?: boolean
): Promise<OpenPaasUserData> {
  if (isResource) {
    const owner = await fetchOwnerOfResource(ownerId)
    return {
      ...owner,
      resource: true
    }
  }
  return fetchOwnerData(ownerId)
}
