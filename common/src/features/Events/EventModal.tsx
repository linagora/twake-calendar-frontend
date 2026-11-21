import { useAppSelector } from '@common/app/hooks'
import { canHoldUserEvents } from '@common/features/Calendars/utils/calendarPermissions'
import { ConfirmDiscardChangesDialog } from '@common/components/Dialog/ConfirmDiscardChangesDialog'
import { ResponsiveDialog } from '@common/components/Dialog'
import EventFormFields from '@common/components/Event/EventFormFields'
import type { EventFormHandle } from '@common/components/Event/EventFormFields.types'
import { clearEventFormTempData } from '@common/utils/eventFormTempStorage'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { CalendarApi, DateSelectInfo } from '@fullcalendar/react'
import { Box, IconButton, Stack, Typography } from '@linagora/twake-mui'
import CloseIcon from '@mui/icons-material/Close'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useCalendarPreviewSync } from '@common/components/Event/hooks/useCalendarPreviewSync'
import { EventActions } from './EventActions'
import { useBuildInitialValues } from '@common/components/Event/hooks/useBuildInitialValues'
import { useSubmitCreateEvent } from '@common/features/Events/hooks/useSubmitCreateEvent'
import { useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard'
import { isListView } from '@common/components/Calendar/utils/constants'
import { useSubmitOnce } from './hooks/useSubmitOnce'

const EventPopover: React.FC<{
  open: boolean
  onClose: (refresh?: boolean) => void
  selectedRange: DateSelectInfo | null
  setSelectedRange: React.Dispatch<React.SetStateAction<DateSelectInfo | null>>
  setDraftCalendarId?: (id: string) => void
  calendarRef: React.RefObject<CalendarApi | null>
  event?: CalendarEvent
  anchorEl?: HTMLElement | null
  currentView?: string
  /** Called with the event once it is saved */
  onCreated?: (event: CalendarEvent) => void
  /**
   * Framed by another page, the form is all the page shows, drawn in the
   * page (EmbeddedForm): no dialog, so no expand arrow (More options still
   * opens the full form), no backdrop to click, nothing to drag
   */
  embedded?: boolean
  /**
   * Embedded: true once a save is sent, false once it failed (a saved one
   * stays true). The one source of « a save is in flight » for the page
   * around (NewEventIntentPage)
   */
  onSavingChange?: (isSaving: boolean) => void
}> = ({
  open,
  onClose,
  selectedRange,
  setSelectedRange,
  setDraftCalendarId,
  calendarRef,
  event,
  anchorEl,
  currentView,
  onCreated,
  embedded = false,
  onSavingChange
}) => {
  const { t } = useI18n()

  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const calList = useAppSelector(state => state.calendars.list)

  const [showMore, setShowMore] = useState(false)
  const [selectedCalendarId, setSelectedCalendarId] = useState<
    string | undefined
  >(undefined)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const formRef = useRef<EventFormHandle>(null)

  const guard = useUnsavedChangesGuard(open && isFormDirty)

  const initialValues = useBuildInitialValues({
    event,
    selectedRange: open ? selectedRange : null
  })

  const userPersonalCalendars: Calendar[] = Object.values(calList || {}).filter(
    cal => canHoldUserEvents(cal, userId)
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
    onCreated,
    userPersonalCalendars
  })

  const { submitOnce, saving } = useSubmitOnce(handleSubmit, onSavingChange)

  const performClose = useCallback(() => {
    clearEventFormTempData('create')
    setIsFormDirty(false)
    onClose(false)
    setShowMore(false)
    setSelectedCalendarId(undefined)
  }, [onClose])

  const handleClose = useCallback(() => {
    guard.requestClose(performClose)
  }, [guard, performClose])

  const handleCalendarChange = useCallback(
    (newCalendarId: string) => {
      setSelectedCalendarId(newCalendarId)
      setDraftCalendarId?.(newCalendarId)
    },
    [setDraftCalendarId]
  )

  const onKeyDownCapture = (e: React.KeyboardEvent): void =>
    submitOnEnter(e, !showMore, formRef)

  const actions = (
    <EventActions
      showExpandedBtn={!showMore}
      onClose={handleClose}
      onSave={async () => {
        await formRef.current?.submit()
      }}
      onExpanded={() => setShowMore(s => !s)}
      isSaveDisabled={saving || isUploading}
    />
  )
  const fields = (
    <EventFormFields
      ref={formRef}
      initialValues={initialValues}
      showMore={showMore}
      isOpen={open}
      typeOfAction={undefined}
      eventId={event?.uid ?? null}
      userPersonalCalendars={userPersonalCalendars}
      onSubmit={embedded ? submitOnce : handleSubmit}
      onCancel={handleClose}
      tempStorageKey="create"
      onCalendarChange={handleCalendarChange}
      onStartChange={handleStartChange}
      onEndChange={handleEndChange}
      onAllDayChange={handleAllDayChange}
      onDirtyChange={setIsFormDirty}
      onUploadingChange={setIsUploading}
    />
  )

  return (
    <>
      {embedded ? (
        open && (
          <EmbeddedForm
            title={modalTitle}
            onKeyDownCapture={onKeyDownCapture}
            onClose={handleClose}
            actions={actions}
          >
            {fields}
          </EmbeddedForm>
        )
      ) : (
        <ResponsiveDialog
          open={open}
          onKeyDownCapture={onKeyDownCapture}
          anchorEl={anchorEl}
          dynamicPositioning={
            !isListView(currentView) &&
            Boolean(anchorEl) &&
            anchorEl !== document.body
          }
          onClose={handleClose}
          title={modalTitle}
          isExpanded={showMore}
          onExpandToggle={(): void => setShowMore(s => !s)}
          draggable={!showMore}
          actions={actions}
          expandText={t('tooltip.moreEventOptions')}
        >
          {fields}
        </ResponsiveDialog>
      )}
      <ConfirmDiscardChangesDialog
        open={guard.showConfirm}
        onCancel={guard.cancelClose}
        onConfirm={() => {
          performClose()
          guard.confirmClose()
        }}
      />
    </>
  )
}

// A plain press of Enter: not while composing (an IME), held, nor with Alt
function isPlainEnter(e: React.KeyboardEvent): boolean {
  return (
    e.key === 'Enter' && !e.nativeEvent.isComposing && !e.repeat && !e.altKey
  )
}

// Enter in the title of the compact form, or Ctrl/Cmd+Enter anywhere,
// saves
function submitOnEnter(
  e: React.KeyboardEvent,
  isCompact: boolean,
  formRef: React.RefObject<EventFormHandle | null>
): void {
  if (!isPlainEnter(e)) return
  const target = e.target as HTMLElement
  const compactTitle =
    isCompact &&
    target instanceof HTMLInputElement &&
    target.dataset.eventTitle === 'true'
  if (e.ctrlKey || e.metaKey || (compactTitle && !e.shiftKey)) {
    e.preventDefault()
    e.stopPropagation()
    void formRef.current?.submit()
  }
}

/**
 * Framed by another page (the intent of Twake Chat), the form is the page
 * itself, not a dialog of its own: its title and close button, the fields,
 * the actions, the full width of the frame. Nothing around it closes it nor
 * drags it.
 */
function EmbeddedForm({
  title,
  onKeyDownCapture,
  onClose,
  actions,
  children
}: {
  title: string
  onKeyDownCapture: (e: React.KeyboardEvent) => void
  onClose: () => void
  actions: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Stack spacing={2} sx={{ p: 3 }} onKeyDownCapture={onKeyDownCapture}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label={t('actions.close')}
          size="xsmall"
        >
          <CloseIcon />
        </IconButton>
      </Box>
      {children}
      {actions}
    </Stack>
  )
}

export default EventPopover
