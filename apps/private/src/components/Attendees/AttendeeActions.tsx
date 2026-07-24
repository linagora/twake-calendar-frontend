import { Box, Button, IconButton, useTheme, alpha } from '@linagora/twake-mui'
import { Icon, CalendarToday, EmailOpen, Discuss } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@common/app/hooks'
import { resolveMailSpaUrl } from '@common/utils/mailUrlUtils'
import { resolveChatSpaUrl } from '@common/utils/chatUrlUtils'
import { Tooltip } from '@common/components/Tooltip'
import { useCheckInternalUser } from './useCheckInternalUser'
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
  const navigate = useNavigate()

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const userEmail = useAppSelector(state => state.user.userData?.email)

  const mailSpaUrl = resolveMailSpaUrl({
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn
  })

  const chatSpaUrl = resolveChatSpaUrl({
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn,
    target: getUserNameFromEmail(attendee.cal_address)
  })

  const { isInternalUser, loading } = useCheckInternalUser(
    attendee.cal_address,
    chatSpaUrl
  )

  const handleSendMail = (): void => {
    if (!mailSpaUrl) return
    window.open(
      `${mailSpaUrl}/mailto/?uri=${encodeURIComponent(attendee.asMailto())}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const handleOpenChat = (): void => {
    if (!chatSpaUrl) return
    window.open(chatSpaUrl, '_blank', 'noopener,noreferrer')
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
      {chatSpaUrl && (
        <Tooltip
          title={
            !isInternalUser
              ? t('tooltip.cannotOpenChatExternalUser')
              : t('tooltip.openChat', { attendee: attendee.cn })
          }
        >
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <IconButton
              onClick={handleOpenChat}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '50%',
                padding: 1,
                color: alpha(theme.palette.grey[900], 0.9)
              }}
              size="small"
              disabled={!isInternalUser || loading}
              loading={loading}
            >
              <Icon icon={Discuss} size={20} />
            </IconButton>
          </Box>
        </Tooltip>
      )}
      <Tooltip
        title={t('tooltip.createEventWithAttendee', { attendee: attendee.cn })}
      >
        <IconButton
          onClick={() => {
            navigate(
              `/newEvent?attendee=${encodeURIComponent(attendee.cal_address)}`
            )
          }}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '50%',
            padding: 1,
            color: alpha(theme.palette.grey[900], 0.9)
          }}
          size="small"
        >
          <Icon icon={CalendarToday} size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
