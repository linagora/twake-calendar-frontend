import { Box, Button, useTheme, alpha } from '@linagora/twake-mui'
import { Icon, EmailOpen } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { resolveMailSpaUrl } from '@common/utils/mailUrlUtils'
import { userAttendee } from '@common/features/User/models/attendee'

const getUserNameFromEmail = (email: string | undefined): string => {
  return email?.split('@')[0] || ''
}

export function AttendeeActions({
  attendee
}: {
  attendee: userAttendee
}): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const userEmail = useAppSelector(state => state.user.userData?.email)

  const mailSpaUrl = resolveMailSpaUrl({
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn
  })

  const handleSendMail = (): void => {
    if (!mailSpaUrl) return
    window.open(
      `${mailSpaUrl}/mailto/?uri=${encodeURIComponent(
        `mailto:${attendee.cal_address}`
      )}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        mt: 1,
        alignItems: 'center'
      }}
    >
      {mailSpaUrl && (
        <Button
          variant="outlined"
          startIcon={<Icon icon={EmailOpen} size={18} />}
          onClick={handleSendMail}
          sx={{
            borderRadius: 6,
            textTransform: 'none',
            borderColor: 'divider',
            color: alpha(theme.palette.grey[900], 0.9)
          }}
        >
          {t('attendees.sendMail')}
        </Button>
      )}
    </Box>
  )
}
