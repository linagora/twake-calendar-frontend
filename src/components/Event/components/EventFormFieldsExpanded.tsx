import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { FormControl, TextField } from '@linagora/twake-mui'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { Resource, ResourceSearch } from '../../Attendees/ResourceSearch'
import { EventFormFieldsSpecific } from './EventFormFieldsSpecific'
import { FieldWithLabel } from './FieldWithLabel'

interface EventFormFieldsExpandedProps {
  alarm: string
  setAlarm: (v: string) => void
  busy: string
  setBusy: (v: string) => void
  eventClass: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  setEventClass: (v: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL') => void
  showMore: boolean
  selectedResources: Resource[]
  setSelectedResources: (resources: Resource[]) => void
}

export const EventFormFieldsExpanded: React.FC<
  EventFormFieldsExpandedProps
> = ({
  alarm,
  setAlarm,
  busy,
  setBusy,
  eventClass,
  setEventClass,
  showMore,
  selectedResources,
  setSelectedResources
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (!showMore) return null

  return (
    <>
      {showMore && !window.HIDE_RESOURCES && (
        <FieldWithLabel
          label={t('event.form.resource')}
          isExpanded={showMore && !isMobile}
        >
          <FormControl fullWidth margin="dense" size="small">
            <ResourceSearch
              objectTypes={['resource']}
              selectedResources={selectedResources}
              inputSlot={params => <TextField {...params} size="small" />}
              onChange={(_event: React.SyntheticEvent, value: Resource[]) =>
                setSelectedResources(value)
              }
              hideLabel={true}
            />
          </FormControl>
        </FieldWithLabel>
      )}

      <EventFormFieldsSpecific
        alarm={alarm}
        setAlarm={setAlarm}
        busy={busy}
        setBusy={setBusy}
        eventClass={eventClass}
        setEventClass={setEventClass}
        showMore={showMore}
      />
    </>
  )
}
