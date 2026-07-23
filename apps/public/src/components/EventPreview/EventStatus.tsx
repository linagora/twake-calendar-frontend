import { classIcon } from '@common/components/Event/utils/eventUtils'
import { PartStat } from '@common/features/User/models/attendee'
import { Box, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export const EventStatus = ({
  partStat,
  isOrganizer
}: {
  partStat?: PartStat
  isOrganizer?: boolean
}) => {
  const { t } = useI18n()
  const icon = classIcon(partStat, 'big')
  const statusText = partStat
    ? t(`eventPreview.${isOrganizer ? 'organizer' : 'attendee'}.${partStat}`)
    : t(`eventPreview.${isOrganizer ? 'organizer' : 'attendee'}.WAITING`)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}
    >
      {icon}
      <Typography variant="body2">{statusText}</Typography>
    </Box>
  )
}
