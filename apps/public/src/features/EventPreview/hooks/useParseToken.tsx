import { useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { PartStat } from '@common/features/User/models/attendee'

interface EventFromDecodedToken {
  calendarURI: string
  uid: string
  action: PartStat | 'REJECTED'
  organizerEmail: string
  attendeeEmail: string
}

export interface ParsedToken extends Omit<
  EventFromDecodedToken,
  'calendarURI' | 'uid'
> {
  calId: string
  eventId: string
  jwt: string
  action: PartStat
}

function decodeJwt(token: string): EventFromDecodedToken | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const jsonPayload = decodeURIComponent(
      window
        .atob(paddedBase64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload) as EventFromDecodedToken
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export function useParseToken(): ParsedToken | null {
  const [searchParams] = useSearchParams()
  const jwt = searchParams.get('jwt')

  return useMemo(() => {
    if (!jwt) return null

    const decoded = decodeJwt(jwt)
    if (!decoded) return null

    return {
      jwt,
      calId: decoded.calendarURI || '',
      eventId: decoded.uid || '',
      action: decoded.action === 'REJECTED' ? 'DECLINED' : decoded.action,
      organizerEmail: decoded.organizerEmail || '',
      attendeeEmail: decoded.attendeeEmail || ''
    }
  }, [jwt])
}

export default useParseToken
