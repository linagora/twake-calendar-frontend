import { api } from '@common/utils/apiUtils'
import { SearchEventsResponse } from './types/SearchEventsResponse'

export interface SearchEventRequest {
  query: string
  calendars: {
    calendarId: string
    userId: string
  }[]
  organizers?: string[]
  attendees?: string[]
}

export async function searchEvent(
  reqParam: SearchEventRequest
): Promise<SearchEventsResponse> {
  return api
    .post('calendar/api/events/search?limit=30&offset=0', {
      body: JSON.stringify(reqParam)
    })
    .json()
}
