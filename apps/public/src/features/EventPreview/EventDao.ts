import { api } from '@common/utils/apiUtils'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'

export interface EventParticipationResponse {
  eventJSON: VCalComponent
  attendeeEmail: string
  locale: string
  links: {
    yes: string
    no: string
    maybe: string
  }
}

export async function fetchEvent(
  jwt: string
): Promise<EventParticipationResponse> {
  const response = await api.get(
    `calendar/api/calendars/event/participation?jwt=${encodeURIComponent(jwt)}`
  )
  if (!response.ok) {
    throw new Error(`fetchEvent failed with status ${response.status}`)
  }
  return response.json()
}
