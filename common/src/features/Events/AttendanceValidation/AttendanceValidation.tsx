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

interface AttendanceValidationProps {
  contextualizedEvent: ContextualizedEvent
  user: userData | undefined
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>
  hideCounterProposalSection?: boolean
}

export function AttendanceValidation({
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
  hideCounterProposalSection
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
