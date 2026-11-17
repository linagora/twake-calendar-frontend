import { useSearchParams } from 'react-router'
import { useMemo } from 'react'
import { PartStat } from '@common/features/User/models/attendee'
import { ParticipationAction, toParticipationAction } from '../EventDao'

interface EventFromDecodedToken {
  calendarURI: string
  uid: string
  // Only in tokens signed before the answer moved to the link
  action?: ParticipationAction
  organizerEmail: string
  attendeeEmail: string
}

export interface ParsedToken {
  calId: string
  eventId: string
  jwt: string
  organizerEmail: string
  attendeeEmail: string
  // The answer of the link, to send back to the server
  participationAction: ParticipationAction | undefined
  // The same answer, as the attendee's participation status
  action: PartStat | undefined
}

const toPartStat = (
  action: ParticipationAction | undefined
): PartStat | undefined => (action === 'REJECTED' ? 'DECLINED' : action)

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
  const linkAction = searchParams.get('action')

  return useMemo(() => {
    if (!jwt) return null

    const decoded = decodeJwt(jwt)
    if (!decoded) return null

    const participationAction =
      toParticipationAction(linkAction) ?? toParticipationAction(decoded.action)

    return {
      jwt,
      calId: decoded.calendarURI || '',
      eventId: decoded.uid || '',
      participationAction,
      action: toPartStat(participationAction),
      organizerEmail: decoded.organizerEmail || '',
      attendeeEmail: decoded.attendeeEmail || ''
    }
  }, [jwt, linkAction])
}

export default useParseToken
