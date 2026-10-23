import { ContactPopover } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@common/app/hooks'
import {
  buildMailComposerUrl,
  resolveMailSpaUrl,
  resolveChatSpaUrl
} from '@linagora/twake-utils'
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
  const composeUrl =
    mailSpaUrl && buildMailComposerUrl(mailSpaUrl, [attendee.cal_address])

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

  return (
    <>
      {composeUrl && <ContactPopover.EmailAction url={composeUrl} />}
      {chatSpaUrl && (
        <ContactPopover.ChatAction
          url={chatSpaUrl}
          label={
            !isInternalUser
              ? t('tooltip.cannotOpenChatExternalUser')
              : t('tooltip.openChat', { attendee: attendee.cn })
          }
          disabled={!isInternalUser || loading}
        />
      )}
      <ContactPopover.CalendarAction
        label={t('tooltip.createEventWithAttendee', { attendee: attendee.cn })}
        onClick={() => {
          navigate(
            `/newEvent?attendee=${encodeURIComponent(attendee.cal_address)}`
          )
        }}
      />
    </>
  )
}
