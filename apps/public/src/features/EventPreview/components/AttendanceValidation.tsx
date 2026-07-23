import React, { useState } from 'react'
import { PartStat } from '@common/features/User/models/attendee'
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  useTheme,
  useMediaQuery,
  Theme
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

const rsvpColor: Record<PartStat, 'success' | 'error' | 'warning' | 'primary'> =
  {
    ACCEPTED: 'success',
    DECLINED: 'error',
    TENTATIVE: 'warning',
    'NEEDS-ACTION': 'primary'
  } as const

interface AttendanceValidationProps {
  currentUserPartstat?: PartStat
  links?: {
    yes: string
    no: string
    maybe: string
  }
  onChoice: (url: string) => Promise<void>
}

export const AttendanceValidation: React.FC<AttendanceValidationProps> = ({
  links,
  currentUserPartstat,
  onChoice
}) => {
  const { t } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [clickedValue, setClickedValue] = useState<PartStat | null>(null)

  const handleClick = async (
    rsvpValue: PartStat,
    url: string | undefined
  ): Promise<void> => {
    if (!url || clickedValue) return
    setClickedValue(rsvpValue)
    try {
      await onChoice(url)
    } catch (err: unknown) {
      console.error('RSVP choice failed:', err)
    } finally {
      setClickedValue(null)
    }
  }

  const renderButton = (
    rsvpValue: PartStat,
    linkUrl: string | undefined
  ): JSX.Element => {
    const isCurrentlyActive = currentUserPartstat === rsvpValue
    const isThisLoading = clickedValue === rsvpValue
    const shouldShowActive =
      isThisLoading || (isCurrentlyActive && !clickedValue)
    const buttonColor = shouldShowActive ? rsvpColor[rsvpValue] : 'primary'

    return (
      <Button
        variant={shouldShowActive ? 'contained' : 'outlined'}
        color={buttonColor}
        size="medium"
        sx={{
          borderRadius: '50px',
          '&.Mui-disabled': shouldShowActive
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
        onClick={() => void handleClick(rsvpValue, linkUrl)}
        disabled={!!clickedValue || !linkUrl}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isThisLoading && <CircularProgress size={20} color="inherit" />}
          {t(`eventPreview.${rsvpValue}`)}
        </Box>
      </Button>
    )
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        {!isMobile && (
          <Typography variant="body2" sx={{ marginRight: 1 }}>
            {t('eventPreview.wantToChangeQuestion')}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mx: 1, alignItems: 'center' }}>
          {renderButton('ACCEPTED', links?.yes)}
          {renderButton('DECLINED', links?.no)}
          {renderButton('TENTATIVE', links?.maybe)}
        </Box>
      </Box>
    </Box>
  )
}
