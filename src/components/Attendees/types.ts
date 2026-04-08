export interface User {
  email: string
  displayName: string
  avatarUrl?: string
  openpaasId?: string
  color?: Record<string, string>
  objectType?: string
}
