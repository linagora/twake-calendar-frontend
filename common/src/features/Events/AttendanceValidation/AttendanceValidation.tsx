import type { JSX } from 'react'
import { PartStat } from '@common/features/User/models/attendee'
import { userData } from '@common/features/User/userDataTypes'
import { Box, useTheme, useMediaQuery } from '@linagora/twake-mui'
import { Dispatch, SetStateAction, useState } from 'react'
import { ContextualizedEvent } from '@common/types/EventsTypes'
import { EventCounterModal } from './EventCounterModal'
import { RSVPSection } from './RSVPSection'
import { CounterProposalSection } from './CounterProposalSection'
import { useAttendanceValidationAuthorization } from './useAttendanceValidationAuthorization'
import { Calendar } from '@common/types/CalendarTypes'
import { makeDisplayName } from '@common/utils/makeDisplayName'

// On a calendar shared with the viewer, the answer shown is its owner's
function answeredForName(calendar: Calendar): string | undefined {
  const { delegated, owner } = calendar
  if (!delegated || owner?.teamCalendar || owner?.resource) return undefined
  return makeDisplayName(calendar) ?? owner?.emails?.[0]
}

interface AttendanceValidationProps {
  contextualizedEvent: ContextualizedEvent
  user: userData | undefined
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>
  hideCounterProposalSection?: boolean
  /** Told when a reply starts and once the server answered it */
  onReplyingChange?: (isReplying: boolean) => void
}

export function AttendanceValidation({
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
  hideCounterProposalSection,
  onReplyingChange
}: AttendanceValidationProps): JSX.Element | null {
  const { calendar } = contextualizedEvent
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isLoading, setIsLoading] = useState(false)
  const [loadingValue, setLoadingValue] = useState<PartStat | null>(null)
  const [openCounterModal, setOpenCounterModal] = useState(false)

  const { isAuthorized } = useAttendanceValidationAuthorization(
    contextualizedEvent,
    user
  )

  if (!isAuthorized) {
    return null
  }

  const handleLoadingChange = (loading: boolean, value?: PartStat): void => {
    setIsLoading(loading)
    setLoadingValue(loading && value ? value : null)
    onReplyingChange?.(loading)
  }

  const commonButtonProps = {
    contextualizedEvent,
    user,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    isLoading,
    onLoadingChange: handleLoadingChange,
    loadingValue
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : undefined,
        alignItems: 'center'
      }}
    >
      <RSVPSection
        isMobile={isMobile}
        isResource={!!calendar.owner?.resource}
        answeredForName={answeredForName(calendar)}
        commonButtonProps={commonButtonProps}
      />
      {!hideCounterProposalSection && (
        <CounterProposalSection
          isOrganizer={contextualizedEvent.isOrganizer}
          onToggle={() => setOpenCounterModal(!openCounterModal)}
        />
      )}
      <EventCounterModal
        open={openCounterModal}
        setOpen={setOpenCounterModal}
        contextualizedEvent={contextualizedEvent}
      />
    </Box>
  )
}
