import React from 'react'
import { FreeBusyField } from '@common/components/Event/fields/FreeBusyField'
import { NotificationField } from '@common/components/Event/fields/NotificationField'
import { VisibilityField } from '@common/components/Event/fields/VisibilityField'
import { Valarms } from '@common/types/Valarms'

interface EventFormFieldsSpecificProps {
  alarms: Valarms
  setAlarms: (v: Valarms) => void
  busy: string
  setBusy: (v: string) => void
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (v: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  showMore: boolean
  isOrganizer?: boolean
}

export const EventFormFieldsSpecific: React.FC<
  EventFormFieldsSpecificProps
> = ({
  alarms,
  setAlarms,
  busy,
  setBusy,
  eventClass,
  setEventClass,
  showMore,
  isOrganizer
}) => {
  return (
    <>
      <NotificationField
        alarms={alarms}
        setAlarms={setAlarms}
        showMore={showMore}
      />
      {!isOrganizer && (
        <>
          <FreeBusyField busy={busy} setBusy={setBusy} showMore={showMore} />

          {!window.DISABLE_PUBLIC_VISIBILITY && (
            <VisibilityField
              eventClass={eventClass}
              setEventClass={setEventClass}
              showMore={showMore}
            />
          )}
        </>
      )}
    </>
  )
}
