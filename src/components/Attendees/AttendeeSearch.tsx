import { userAttendee } from '@/features/User/models/attendee'
import { createAttendee } from '@/features/User/models/attendee.mapper'
import { useEffect, useRef, useState } from 'react'
import { FreeBusyIndicator } from './FreeBusyIndicator'
import {
  ExtendedAutocompleteRenderInputParams,
  PeopleSearch
} from './PeopleSearch'
import { User } from './types'
import { FreeBusyMap, useAttendeesFreeBusy } from './useFreeBusy'

const attendeeToUser = (a: userAttendee, openpaasId = ''): User => ({
  email: a.cal_address,
  displayName: a.cn ?? '',
  avatarUrl: '',
  openpaasId
})

const hasCalendar = (u: User) => u.objectType === 'user' && !!u.openpaasId

export default function AttendeeSearch({
  attendees,
  setAttendees,
  disabled,
  inputSlot,
  placeholder,
  start,
  end,
  timezone,
  eventUid
}: {
  attendees: userAttendee[]
  setAttendees: (attendees: userAttendee[]) => void
  disabled?: boolean
  inputSlot?: (params: ExtendedAutocompleteRenderInputParams) => React.ReactNode
  placeholder?: string
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}) {
  const [userIdMap, setUserIdMap] = useState<Record<string, string>>({})
  const [addedUsers, setAddedUsers] = useState<User[]>([])
  const initialEmailsRef = useRef<Set<string> | null>(null)
  const [initialEmailsSet, setInitialEmailsSet] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    const updateInitialEmailsSet = () => {
      if (
        initialEmailsRef.current === null &&
        !!eventUid &&
        attendees.length > 0
      ) {
        initialEmailsRef.current = new Set(attendees.map(a => a.cal_address))
        setInitialEmailsSet(initialEmailsRef.current)
      }
    }
    updateInitialEmailsSet()
  }, [eventUid, attendees])

  const initialEmails = eventUid ? initialEmailsSet : new Set<string>()

  const selectedUsers: User[] = [
    ...addedUsers,
    ...attendees
      .map(a => attendeeToUser(a, userIdMap[a.cal_address]))
      .filter(a => !addedUsers.find(u => a.email === u.email))
  ]

  const toAttendee = (u: User) => ({
    email: u.email,
    userId: u.openpaasId || userIdMap[u.email] || null
  })

  const existingAttendees = selectedUsers
    .filter(u => initialEmails.has(u.email))
    .map(toAttendee)
  const newAttendees = selectedUsers
    .filter(u => !initialEmails.has(u.email) && hasCalendar(u))
    .map(toAttendee)

  // Contacts and freeSolo users get a static "contact" status — no API call needed
  const contactMap: FreeBusyMap = Object.fromEntries(
    selectedUsers
      .filter(u => !initialEmails.has(u.email) && !hasCalendar(u))
      .map(u => [u.email, 'contact' as const])
  )

  const freeBusyMap = useAttendeesFreeBusy({
    existingAttendees,
    newAttendees,
    start: start ?? '',
    end: end ?? '',
    timezone: timezone ?? '',
    eventUid,
    enabled: !!(start && end && selectedUsers.length > 0)
  })

  const statusMap = { ...freeBusyMap, ...contactMap }

  return (
    <PeopleSearch
      selectedUsers={selectedUsers}
      objectTypes={['user', 'contact']}
      disabled={disabled}
      inputSlot={inputSlot}
      placeholder={placeholder}
      getChipIcon={
        start && end
          ? user => (
              <FreeBusyIndicator status={statusMap[user.email] ?? 'unknown'} />
            )
          : undefined
      }
      onChange={(_event, value: User[]) => {
        setUserIdMap(prev => {
          const next = { ...prev }
          for (const u of value) {
            if (u.openpaasId && u.email) next[u.email] = u.openpaasId
          }
          return next
        })
        setAddedUsers(value.filter(u => !initialEmails.has(u.email)))
        setAttendees(
          value.map(u =>
            createAttendee({ cal_address: u.email, cn: u.displayName })
          )
        )
      }}
      freeSolo
    />
  )
}
