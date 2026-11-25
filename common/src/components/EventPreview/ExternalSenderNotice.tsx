import type { JSX } from 'react'
import { userAttendee } from '@common/features/User/models/attendee'
import { stripMailto } from '@common/utils/normalizeIdentity'
import { Alert, AlertTitle } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

/**
 * Once an invitation is in the calendar, its mail and the warning banner of
 * the mail are gone: the preview is the only place left to tell the user that
 * the organizer did not send it. Shown without expanding the participants.
 */
export function ExternalSenderNotice({
  organizer,
  sentBy
}: {
  organizer: userAttendee
  sentBy: string
}): JSX.Element {
  const { t } = useI18n()
  const organizerEmail = stripMailto(organizer.cal_address)

  return (
    <Alert severity="warning" role="alert">
      <AlertTitle>
        {t('eventPreview.externalSender.title', {
          sentBy: stripMailto(sentBy),
          organizerName: organizer.cn || organizerEmail
        })}
      </AlertTitle>
      {t('eventPreview.externalSender.description', { organizerEmail })}
    </Alert>
  )
}
