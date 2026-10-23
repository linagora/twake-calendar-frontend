import { ContactPopover } from '@linagora/twake-mui'
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
}): JSX.Element | null {
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

  return composeUrl ? <ContactPopover.EmailAction url={composeUrl} /> : null
}
