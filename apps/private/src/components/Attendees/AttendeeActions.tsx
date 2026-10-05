import { Box, Button, IconButton, useTheme, alpha } from '@linagora/twake-mui'
import { Icon, CalendarToday, EmailOpen, Discuss } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@common/app/hooks'
import {
  buildMailComposerUrl,
  resolveMailSpaUrl,
  resolveChatSpaUrl
} from '@linagora/twake-utils'
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

  const mailSpaUrl = resolveMailSpaUrl(window.MAIL_SPA_URL, {
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })

  const chatSpaUrl = resolveChatSpaUrl(window.CHAT_SPA_URL, {
    localpart: getUserNameFromEmail(userEmail),
    workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK,
    target: getUserNameFromEmail(attendee.cal_address)
  })

  const { isInternalUser, loading } = useCheckInternalUser(
    attendee.cal_address,
    chatSpaUrl
  )

  const handleSendMail = (): void => {
    if (!mailSpaUrl) return
    const composeUrl = buildMailComposerUrl(mailSpaUrl, [attendee.cal_address])
    if (!composeUrl) return
    window.open(composeUrl, '_blank', 'noopener,noreferrer')
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
              aria-label={
                !isInternalUser
                  ? t('tooltip.cannotOpenChatExternalUser')
                  : t('tooltip.openChat', { attendee: attendee.cn })
              }
              onClick={handleOpenChat}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '50%',
                padding: 1,
                color: alpha(theme.palette.grey[900], 0.9),
                '&.Mui-disabled': { color: alpha(theme.palette.grey[900], 0.9) }
              }}
              size="small"
              disabled={!isInternalUser || loading}
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
