import { userAttendee } from '@common/features/User/models/attendee'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FreeBusyIndicator } from './FreeBusyIndicator'
import {
  ExtendedAutocompleteRenderInputParams,
  PeopleSearch
} from './PeopleSearch'
import { User } from './types'
import { FreeBusyStatus, useAttendeesFreeBusy } from './useFreeBusy'

const attendeeToUser = (a: userAttendee, openpaasId = ''): User => ({
  email: a.cal_address,
  displayName: a.cn ?? '',
  avatarUrl: '',
  openpaasId
})

const hasCalendar = (u: User): boolean =>
  u.objectType === 'user' && !!u.openpaasId

function useAttendeeSearchLogic({
  attendees,
  eventUid,
  start,
  end,
  timezone
}: {
  attendees: userAttendee[]
  eventUid?: string | null
  start?: string
  end?: string
  timezone?: string
}): {
  selectedUsers: User[]
  initialEmails: Set<string>
  statusMap: Record<string, FreeBusyStatus>
  setUserIdMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setAddedUsers: React.Dispatch<React.SetStateAction<User[]>>
} {
  const [userIdMap, setUserIdMap] = useState<Record<string, string>>({})
  const [addedUsers, setAddedUsers] = useState<User[]>([])
  const initialEmailsRef = useRef<Set<string> | null>(null)
  const [initialEmailsSet, setInitialEmailsSet] = useState<Set<string>>(
    new Set()
  )

  const prevEventUidRef = useRef<string | null | undefined>(null)

  useEffect(() => {
    const updateInitialEmailsSet = (): void => {
      // Reset when switching events
      if (prevEventUidRef.current !== eventUid) {
        initialEmailsRef.current = null
        prevEventUidRef.current = eventUid
      }

      const shouldInitializeInitialEmails =
        initialEmailsRef.current === null && !!eventUid && attendees.length > 0

      if (shouldInitializeInitialEmails) {
        initialEmailsRef.current = new Set(attendees.map(a => a.cal_address))
        setInitialEmailsSet(initialEmailsRef.current)
      }
    }
    updateInitialEmailsSet()
  }, [eventUid, attendees])

  const initialEmails = useMemo(
    () => (eventUid ? initialEmailsSet : new Set<string>()),
    [eventUid, initialEmailsSet]
  )

  const selectedUsers = useMemo(
    () => [
      ...addedUsers,
      ...attendees
        .map(a => attendeeToUser(a, userIdMap[a.cal_address]))
        .filter(a => !addedUsers.find(u => a.email === u.email))
    ],
    [addedUsers, attendees, userIdMap]
  )

  const categorization = useMemo(() => {
    const toAttendee = (u: User): { email: string; userId: string | null } => ({
      email: u.email,
      userId: u.openpaasId || userIdMap[u.email] || null
    })

    const existing = selectedUsers
      .filter(u => initialEmails.has(u.email))
      .map(toAttendee)

    const nextNew = selectedUsers
      .filter(u => !initialEmails.has(u.email) && hasCalendar(u))
      .map(toAttendee)

    const contacts = Object.fromEntries(
      selectedUsers
        .filter(u => !initialEmails.has(u.email) && !hasCalendar(u))
        .map(u => [u.email, 'contact' as const])
    )

    return { existing, nextNew, contacts }
  }, [selectedUsers, initialEmails, userIdMap])

  const freeBusyMap = useAttendeesFreeBusy({
    existingAttendees: categorization.existing,
    newAttendees: categorization.nextNew,
    start: start ?? '',
    end: end ?? '',
    timezone: timezone ?? '',
    eventUid,
    enabled: !!(start && end && selectedUsers.length > 0)
  })

  return {
    selectedUsers,
    initialEmails,
    statusMap: { ...freeBusyMap, ...categorization.contacts },
    setUserIdMap,
    setAddedUsers
  }
}

export const AttendeeSearch: React.FC<{
  attendees: userAttendee[]
  setAttendees: (attendees: userAttendee[]) => void
  disabled?: boolean
  inputSlot?: (params: ExtendedAutocompleteRenderInputParams) => React.ReactNode
  placeholder?: string
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
  // WS3 host-delegation: only render the crown toggle on chips when the
  // event has an active Meet URL — delegating admin on a non-existing
  // room is meaningless.
  hasVideoConference?: boolean
}> = ({
  attendees,
  setAttendees,
  disabled,
  inputSlot,
  placeholder,
  start,
  end,
  timezone,
  eventUid,
  hasVideoConference
}) => {
  const {
    selectedUsers,
    initialEmails,
    statusMap,
    setUserIdMap,
    setAddedUsers
  } = useAttendeeSearchLogic({ attendees, eventUid, start, end, timezone })

  const handleOnChange = (
    _event: React.SyntheticEvent,
    value: User[]
  ): void => {
    setUserIdMap(prev => {
      const next = { ...prev }
      value.forEach(u => {
        if (u.openpaasId && u.email) next[u.email] = u.openpaasId
      })
      return next
    })
    setAddedUsers(value.filter(u => !initialEmails.has(u.email)))
    setAttendees(
      value.map(u => {
        // Preserve existing attendee metadata (partstat, is_delegate_host, …)
        // so list mutations don't wipe the crown toggle or other bits.
        const existing = attendees.find(a => a.cal_address === u.email)
        if (existing) return existing
        return new userAttendee({ cal_address: u.email, cn: u.displayName })
      })
    )
  }

  const toggleDelegateHost = (email: string): void => {
    setAttendees(
      attendees.map(a =>
        a.cal_address === email ? a.withDelegateHost(!a.is_delegate_host) : a
      )
    )
  }

  const attendeeByEmail = useMemo(
    () => new Map(attendees.map(a => [a.cal_address, a])),
    [attendees]
  )

  return (
    <PeopleSearch
      selectedUsers={selectedUsers}
      showCurrentUser
      objectTypes={['user', 'contact']}
      disabled={disabled}
      inputSlot={inputSlot}
      placeholder={placeholder}
      getChipIcon={
        start && end
          ? (user): JSX.Element => (
              <FreeBusyIndicator status={statusMap[user.email] ?? 'unknown'} />
            )
          : undefined
      }
      getChipAction={(user): {
        isDelegateHost: boolean
        onToggle: () => void
      } | undefined => {
        if (!hasVideoConference) return undefined
        const att = attendeeByEmail.get(user.email)
        if (!att || att.cutype === 'RESOURCE') return undefined
        return {
          isDelegateHost: att.is_delegate_host,
          onToggle: () => toggleDelegateHost(user.email)
        }
      }}
      onChange={handleOnChange}
      freeSolo
      enableEmailAutocompleteAndCommit
    />
  )
}

export default AttendeeSearch
