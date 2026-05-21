import React from 'react'
import { FreeBusyField } from '../fields/FreeBusyField'
import { NotificationField } from '../fields/NotificationField'
import { VisibilityField } from '../fields/VisibilityField'

interface EventFormFieldsSpecificProps {
  alarm: string
  setAlarm: (v: string) => void
  busy: string
  setBusy: (v: string) => void
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (v: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  showMore: boolean
}

export const EventFormFieldsSpecific: React.FC<
  EventFormFieldsSpecificProps
> = ({
  alarm,
  setAlarm,
  busy,
  setBusy,
  eventClass,
  setEventClass,
  showMore
}) => {
  return (
    <>
      <NotificationField
        alarm={alarm}
        setAlarm={setAlarm}
        showMore={showMore}
      />

      <FreeBusyField busy={busy} setBusy={setBusy} showMore={showMore} />

      {!window.DISABLE_PUBLIC_VISIBILITY && (
        <VisibilityField
          eventClass={eventClass}
          setEventClass={setEventClass}
          showMore={showMore}
        />
      )}
    </>
  )
}
