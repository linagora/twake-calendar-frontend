declare module '@injected/components/Attendees/AttendeeActions' {
  import React from 'react'
  import { userAttendee } from '@common/features/User/models/attendee'

  export function AttendeeActions(props: {
    attendee: userAttendee
  }): React.ReactElement | null
}
