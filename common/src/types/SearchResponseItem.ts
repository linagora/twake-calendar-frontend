import { User } from '@common/components/Attendees/types'

// Type for search response from the API
export class SearchResponseItem {
  id?: string
  emailAddresses?: Array<{ value?: string }>
  names?: Array<{ displayName?: string }>
  photos?: Array<{ url?: string }>
  objectType?: string

  constructor(data?: Partial<SearchResponseItem>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  firstEmail(): string | undefined {
    return this.emailAddresses?.[0]?.value
  }

  firstDisplayName(): string | undefined {
    return this.names?.[0]?.displayName
  }

  firstAvatarUrl(): string | undefined {
    return this.photos?.[0]?.url
  }

  toUser(): User {
    return {
      email: this.firstEmail() || '',
      displayName: this.firstDisplayName() || this.firstEmail() || '',
      avatarUrl: this.firstAvatarUrl() || '',
      openpaasId: this.id,
      objectType: this.objectType
    }
  }
}
