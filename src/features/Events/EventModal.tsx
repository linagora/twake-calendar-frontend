import { useAppSelector } from '@/app/hooks'
import { ResponsiveDialog } from '@/components/Dialog'
import EventFormFields from '@/components/Event/EventFormFields'
import type { EventFormHandle } from '@/components/Event/EventFormFields.types'
import { clearEventFormTempData } from '@/utils/eventFormTempStorage'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Calendar } from '../Calendars/CalendarTypes'
import { CalendarEvent } from './EventsTypes'
import { useEventOrganizer } from './useEventOrganizer'
import { useCalendarPreviewSync } from '@/components/Event/hooks/useCalendarPreviewSync'
import { EventActions } from './EventActions'
import { useBuildInitialValues } from '@/components/Event/hooks/useBuildInitialValues'
import { useSubmitCreateEvent } from '@/features/Events/hooks/useSubmitCreateEvent'

const EventPopover: React.FC<{
  open: boolean
  onClose: (refresh?: boolean) => void
  selectedRange: DateSelectArg | null
  setSelectedRange: React.Dispatch<React.SetStateAction<DateSelectArg | null>>
  calendarRef: React.RefObject<CalendarApi | null>
  event?: CalendarEvent
}> = ({
  open,
  onClose,
  selectedRange,
  setSelectedRange,
  calendarRef,
  event
}) => {
  const { t } = useI18n()

  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)
  const userOrganizer = useAppSelector(state => state.user.organiserData)

  const [showMore, setShowMore] = useState(false)
  const formRef = useRef<EventFormHandle>(null)

  const initialValues = useBuildInitialValues({
    event,
    selectedRange: open ? selectedRange : null
  })

  const { organizer } = useEventOrganizer({
    calendarid: initialValues.calendarid ?? '',
    calList,
    userOrganizer
  })

  const userPersonalCalendars: Calendar[] = Object.values(calList || {}).filter(
    cal =>
      cal.id?.split('/')[0] === userId || (cal.delegated && cal.access?.write)
  )

  useEffect(() => {
    const resetShowMore = (): void => {
      if (!open) setShowMore(false)
    }
    resetShowMore()
  }, [open])

  // Calendar preview sync
  const { handleStartChange, handleEndChange, handleAllDayChange } =
    useCalendarPreviewSync({
      formRef,
      setSelectedRange,
      calendarRef
    })

  const { handleSubmit } = useSubmitCreateEvent({
    showMore,
    onClose: () => onClose(true),
    userPersonalCalendars,
    organizer
  })

  const handleClose = useCallback(() => {
    clearEventFormTempData('create')
    onClose(false)
    setShowMore(false)
  }, [onClose])

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={
        event?.uid
          ? t('eventDuplication.duplicateEvent')
          : t('event.createEvent')
      }
      isExpanded={showMore}
      onExpandToggle={() => setShowMore(s => !s)}
      actions={
        <EventActions
          showExpandedBtn={!showMore}
          onClose={handleClose}
          onSave={async () => {
            await formRef.current?.submit()
          }}
          onExpanded={() => setShowMore(s => !s)}
        />
      }
    >
      <EventFormFields
        ref={formRef}
        initialValues={initialValues}
        showMore={showMore}
        isOpen={open}
        typeOfAction={undefined}
        eventId={event?.uid ?? null}
        userPersonalCalendars={userPersonalCalendars}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        tempStorageKey="create"
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
        onAllDayChange={handleAllDayChange}
      />
    </ResponsiveDialog>
  )
}

export default EventPopover
