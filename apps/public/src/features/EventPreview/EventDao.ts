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

export type ParticipationAction = 'ACCEPTED' | 'REJECTED' | 'TENTATIVE'

const PARTICIPATION_ACTIONS: readonly ParticipationAction[] = [
  'ACCEPTED',
  'REJECTED',
  'TENTATIVE'
]

export function toParticipationAction(
  value: unknown
): ParticipationAction | undefined {
  return PARTICIPATION_ACTIONS.find(action => action === value)
}

// Links carry the answer as an `action` parameter beside a token that no
// longer holds it; tokens signed before still do, and the server then
// ignores the parameter.
export async function fetchEvent(
  jwt: string,
  action?: ParticipationAction
): Promise<EventParticipationResponse> {
  const params = new URLSearchParams({ jwt })
  if (action) params.set('action', action)
  const response = await api.get(
    `calendar/api/calendars/event/participation?${params.toString()}`
  )
  if (!response.ok) {
    throw new Error(`fetchEvent failed with status ${response.status}`)
  }
  return response.json()
}
