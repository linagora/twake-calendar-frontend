import { useAppSelector } from '@common/app/hooks'
import { ResponsiveDialog } from '@common/components/Dialog'
import EventFormFields from '@common/components/Event/EventFormFields'
import type { EventFormHandle } from '@common/components/Event/EventFormFields.types'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useCalendarPreviewSync } from '@common/components/Event/hooks/useCalendarPreviewSync'
import { EventActions } from './EventActions'
import { useBuildInitialValues } from '@common/components/Event/hooks/useBuildInitialValues'
import { useSubmitCreateEvent } from '@common/features/Events/hooks/useSubmitCreateEvent'

const EventPopover: React.FC<{
  open: boolean
  onClose: (refresh?: boolean) => void
  selectedRange: DateSelectArg | null
  setSelectedRange: React.Dispatch<React.SetStateAction<DateSelectArg | null>>
  setDraftCalendarId: (id: string) => void
  calendarRef: React.RefObject<CalendarApi | null>
  event?: CalendarEvent
}> = ({
  open,
  onClose,
  selectedRange,
  setSelectedRange,
  setDraftCalendarId,
  calendarRef,
  event
}) => {
  const { t } = useI18n()

  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)

  const [showMore, setShowMore] = useState(false)
  const [selectedCalendarId, setSelectedCalendarId] = useState<
    string | undefined
  >(undefined)
  const formRef = useRef<EventFormHandle>(null)

  const initialValues = useBuildInitialValues({
    event,
    selectedRange: open ? selectedRange : null
  })

  const userPersonalCalendars: Calendar[] = Object.values(calList || {}).filter(
    cal =>
      cal.id?.split('/')[0] === userId || (cal.delegated && cal.access?.write)
  )

  const currentCalendarId = selectedCalendarId ?? initialValues.calendarid
  const selectedCalendar = useMemo(() => {
    if (!currentCalendarId) return undefined
    return userPersonalCalendars.find(cal => cal.id === currentCalendarId)
  }, [currentCalendarId, userPersonalCalendars])

  const isDelegatedCalendar = !!selectedCalendar?.delegated
  const calendarOwnerName = useMemo(() => {
    if (!isDelegatedCalendar || !selectedCalendar) return ''
    return makeDisplayName(selectedCalendar) ?? ''
  }, [isDelegatedCalendar, selectedCalendar])

  const modalTitle = useMemo(() => {
    if (event?.uid) {
      return t('eventDuplication.duplicateEvent')
    }
    if (isDelegatedCalendar && calendarOwnerName) {
      return t('event.createInAgenda', { owner: calendarOwnerName })
    }
    return t('event.createEvent')
  }, [event?.uid, isDelegatedCalendar, calendarOwnerName, t])

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
    userPersonalCalendars
  })

  const handleClose = useCallback(() => {
    clearEventFormTempData('create')
    onClose(false)
    setShowMore(false)
    setSelectedCalendarId(undefined)
  }, [onClose])

  const handleCalendarChange = useCallback(
    (newCalendarId: string) => {
      setSelectedCalendarId(newCalendarId)
      setDraftCalendarId?.(newCalendarId)
    },
    [setDraftCalendarId]
  )

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={modalTitle}
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
      expandText={t('tooltip.moreEventOptions')}
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
        onCalendarChange={handleCalendarChange}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
        onAllDayChange={handleAllDayChange}
      />
    </ResponsiveDialog>
  )
}

export default EventPopover
