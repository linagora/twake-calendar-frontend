import { Box, Button, useTheme } from '@linagora/twake-mui'
import { Icon, EmailOpen } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { buildMailComposerUrl, resolveMailSpaUrl } from '@linagora/twake-utils'
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

  const mailSpaUrl = resolveMailSpaUrl(window.MAIL_SPA_URL, {
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })

  const handleSendMail = (): void => {
    if (!mailSpaUrl) return
    const composeUrl = buildMailComposerUrl(mailSpaUrl, [attendee.cal_address])
    if (!composeUrl) return
    window.open(composeUrl, '_blank', 'noopener,noreferrer')
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
            color: theme.vars.palette.text.primary
          }}
        >
          {t('attendees.sendMail')}
        </Button>
      )}
    </Box>
  )
}
