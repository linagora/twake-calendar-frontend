import { useAppDispatch } from '@common/app/hooks'
import { PartStat, userAttendee } from '@common/features/User/models/attendee'
import { userData } from '@common/features/User/userDataTypes'
import { Box, Button, CircularProgress, Theme } from '@linagora/twake-mui'
import Tooltip from '@common/components/Tooltip'
import { Dispatch, SetStateAction, useEffect, useRef } from 'react'
import { useI18n } from 'twake-i18n'
import { ContextualizedEvent } from '@common/types/EventsTypes'
import { handleRSVPClick } from './handleRSVPClick'

const rsvpColor: Record<PartStat, 'success' | 'error' | 'warning' | 'primary'> =
  {
    ACCEPTED: 'success',
    DECLINED: 'error',
    TENTATIVE: 'warning',
    'NEEDS-ACTION': 'primary'
  } as const

interface RSVPButtonProps {
  rsvpValue: PartStat
  contextualizedEvent: ContextualizedEvent
  user: userData | undefined
  setAfterChoiceFunc: (
    func: ((type: 'solo' | 'all' | undefined) => void) | undefined
  ) => void
  setOpenEditModePopup: Dispatch<SetStateAction<string | null>>
  isLoading: boolean
  onLoadingChange: (loading: boolean, value?: PartStat) => void
  loadingValue: PartStat | null
}

function useClearLoadingOnStatusChange(
  currentUserAttendee: userAttendee | undefined,
  isLoading: boolean,
  onLoadingChange: (loading: boolean, value?: PartStat) => void
): React.MutableRefObject<PartStat | undefined> {
  const previousPartstatRef = useRef<PartStat | undefined>(
    currentUserAttendee?.partstat
  )

  useEffect(() => {
    const currentPartstat = currentUserAttendee?.partstat

    const statusChanged =
      previousPartstatRef.current !== undefined &&
      currentPartstat !== previousPartstatRef.current

    if (isLoading && statusChanged) {
      onLoadingChange(false)
    }

    previousPartstatRef.current = currentPartstat
  }, [currentUserAttendee?.partstat, isLoading, onLoadingChange])

  return previousPartstatRef
}

export const RSVPButton: React.FC<RSVPButtonProps> = ({
  rsvpValue,
  contextualizedEvent,
  user,
  setAfterChoiceFunc,
  setOpenEditModePopup,
  isLoading,
  onLoadingChange,
  loadingValue
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { currentUserAttendee, calendar } = contextualizedEvent

  const effectivePartstat =
    currentUserAttendee?.partstat ||
    (contextualizedEvent.isOwn ? 'ACCEPTED' : undefined)
  const showLoading = isLoading && loadingValue === rsvpValue
  const isReadDelegated =
    calendar.delegated && calendar.access?.read && !calendar.access?.write

  const previousPartstatRef = useClearLoadingOnStatusChange(
    currentUserAttendee,
    isLoading,
    onLoadingChange
  )

  const handleClick = async (): Promise<void> => {
    // Store current partstat before making changes
    previousPartstatRef.current = currentUserAttendee?.partstat
    if (effectivePartstat === rsvpValue) {
      return
    }
    // For recurring events, don't set loading yet - wait for modal choice
    if (!contextualizedEvent.isRecurring) {
      onLoadingChange(true, rsvpValue)
    }

    try {
      await handleRSVPClick(
        rsvpValue,
        contextualizedEvent,
        user,
        setAfterChoiceFunc,
        setOpenEditModePopup,
        dispatch,
        onLoadingChange
      )
    } catch (error) {
      console.error(
        `[RSVPButton ${rsvpValue}] Error in handleRSVPClick:`,
        error
      )
      // Clear loading on error
      onLoadingChange(false)
    }
  }

  const isCurrentlyActive = effectivePartstat === rsvpValue

  // Show as active (colored) if:
  // 1. This button is currently loading, OR
  // 2. This is the active status AND nothing is loading
  const shouldShowActive = showLoading || (isCurrentlyActive && !isLoading)

  const buttonColor = shouldShowActive ? rsvpColor[rsvpValue] : 'primary'

  return (
    <Tooltip title={t(`tooltip.${rsvpValue}`)}>
      <span>
        <Button
          variant={shouldShowActive ? 'contained' : 'outlined'}
          color={buttonColor}
          size="medium"
          sx={{
            borderRadius: '50px',
            // Override MUI's default disabled styles to keep the color
            '&.Mui-disabled':
              isLoading && shouldShowActive
                ? {
                    backgroundColor: (theme: Theme): string =>
                      theme.palette[buttonColor].main,
                    color: (theme: Theme): string =>
                      theme.palette[buttonColor].contrastText,
                    borderColor: (theme: Theme): string =>
                      theme.palette[buttonColor].main
                  }
                : {}
          }}
          onClick={() => void handleClick()}
          disabled={isLoading || isReadDelegated || isCurrentlyActive}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showLoading && <CircularProgress size={20} color="inherit" />}
            {t(`eventPreview.${rsvpValue}`)}
          </Box>
        </Button>
      </span>
    </Tooltip>
  )
}
