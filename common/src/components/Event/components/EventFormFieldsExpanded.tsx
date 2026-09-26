import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { FormControl, TextField } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import {
  Resource,
  ResourceSearch
} from '@common/components/Attendees/ResourceSearch'
import { Valarms } from '@common/types/Valarms'
import { EventFormFieldsSpecific } from './EventFormFieldsSpecific'
import { FieldWithLabel } from './FieldWithLabel'
import { OrganizerSelectField } from '../fields/OrganizerSelectField'
import { Calendar } from '@common/types/CalendarTypes'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'
import { FreeBusyIndicator } from '@common/components/Attendees/FreeBusyIndicator'
import {
  resourceKey,
  useResourcesFreeBusy
} from '@common/components/Attendees/useResourcesFreeBusy'

interface EventFormFieldsExpandedProps {
  alarms: Valarms
  setAlarms: (v: Valarms) => void
  busy: string
  setBusy: (v: string) => void
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (v: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  showMore: boolean
  selectedResources: Resource[]
  setSelectedResources: (resources: Resource[]) => void
  userOrganizer?: userOrganiser
  selectedCalendar?: Calendar
  isTeamCalendar?: boolean
  isDisableOrganizerSelection?: boolean
  setSelectedOrganizer?: (organizer: userOrganiser) => void
  selectedOrganizer?: userOrganiser
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}

interface ResourceFieldProps {
  selectedResources: Resource[]
  setSelectedResources: (resources: Resource[]) => void
  start?: string
  end?: string
  timezone?: string
  eventUid?: string | null
}

const ResourceField: React.FC<ResourceFieldProps> = ({
  selectedResources,
  setSelectedResources,
  start,
  end,
  timezone,
  eventUid
}) => {
  const inputSize = useResponsiveInputSize()
  const statusMap = useResourcesFreeBusy({
    resources: selectedResources,
    start,
    end,
    timezone,
    eventUid
  })

  return (
    <ResourceSearch
      objectTypes={['resource']}
      selectedResources={selectedResources}
      inputSlot={params => <TextField {...params} size={inputSize} />}
      onChange={(_event: React.SyntheticEvent, value: Resource[]) =>
        setSelectedResources(value)
      }
      hideLabel={true}
      getChipIcon={(resource): JSX.Element =>
        start && end ? (
          <FreeBusyIndicator
            status={statusMap[resourceKey(resource)] ?? 'unknown'}
            isResource
          />
        ) : (
          <></>
        )
      }
    />
  )
}

export const EventFormFieldsExpanded: React.FC<
  EventFormFieldsExpandedProps
> = ({
  alarms,
  setAlarms,
  busy,
  setBusy,
  eventClass,
  setEventClass,
  selectedOrganizer,
  setSelectedOrganizer,
  showMore,
  selectedResources,
  setSelectedResources,
  userOrganizer,
  selectedCalendar,
  isTeamCalendar,
  isDisableOrganizerSelection,
  start,
  end,
  timezone,
  eventUid
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const inputSize = useResponsiveInputSize()

  if (!showMore) return null

  return (
    <>
      {isTeamCalendar &&
        selectedCalendar &&
        selectedOrganizer &&
        setSelectedOrganizer &&
        userOrganizer && (
          <OrganizerSelectField
            calendar={selectedCalendar}
            value={selectedOrganizer}
            onChange={setSelectedOrganizer}
            userOrganizer={userOrganizer}
            showMore={showMore}
            disabled={isDisableOrganizerSelection}
          />
        )}

      {!window.HIDE_RESOURCES && (
        <FieldWithLabel
          label={t('event.form.resource')}
          isExpanded={showMore && !isMobile}
        >
          <FormControl fullWidth margin="dense" size={inputSize}>
            <ResourceField
              selectedResources={selectedResources}
              setSelectedResources={setSelectedResources}
              start={start}
              end={end}
              timezone={timezone}
              eventUid={eventUid}
            />
          </FormControl>
        </FieldWithLabel>
      )}

      <EventFormFieldsSpecific
        alarms={alarms}
        setAlarms={setAlarms}
        busy={busy}
        setBusy={setBusy}
        eventClass={eventClass}
        setEventClass={setEventClass}
        showMore={showMore}
      />
    </>
  )
}
