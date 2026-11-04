import { isEmailShaped } from '@common/types/EmailAddress'

export function isValidEmail(email: string): boolean {
  return isEmailShaped(email)
}
