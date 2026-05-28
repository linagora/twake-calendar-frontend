import { PartStat } from '@common/features/User/models/attendee'
import { userData } from '@common/features/User/userDataTypes'
import { Box, Typography } from '@linagora/twake-mui'
import { Dispatch, SetStateAction } from 'react'
import { useI18n } from 'twake-i18n'
import { ContextualizedEvent } from '@common/types/EventsTypes'
import { RSVPButton } from './RSVPButton'

export interface CommonButtonProps {
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

interface RSVPSectionProps {
  isMobile: boolean
  isResource: boolean
  commonButtonProps: CommonButtonProps
}

export function RSVPSection({
  isMobile,
  isResource,
  commonButtonProps
}: RSVPSectionProps): JSX.Element {
  const { t } = useI18n()
  return (
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
          {isResource
            ? t('eventPreview.authorizeQuestion')
            : t('eventPreview.attendingQuestion')}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, mx: 1, alignItems: 'center' }}>
        <RSVPButton rsvpValue="ACCEPTED" {...commonButtonProps} />
        <RSVPButton rsvpValue="DECLINED" {...commonButtonProps} />
        <RSVPButton rsvpValue="TENTATIVE" {...commonButtonProps} />
      </Box>
    </Box>
  )
}
