import { User } from '@common/components/Attendees/types'
import { SearchResponseItem } from '@common/types/SearchResponseItem'

export const SEARCH_LIMIT = 10

export function parseSearchUserResponse(
  response: SearchResponseItem[]
): User[] {
  return response.map(user => user.toUser())
}
