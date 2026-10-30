import { userAttendee } from '@common/features/User/models/attendee'
import { ContactPopover } from '@linagora/twake-mui'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SnackbarAlert } from '../Loading/SnackBarAlert'
import { AttendeeActions } from '@injected/components/Attendees/AttendeeActions'
import { useAppSelector } from '@common/app/hooks'

interface AttendeePopoverProps {
  attendee: userAttendee
  children: React.ReactElement
  openOnHover?: boolean
}

const normalizeEmail = (email: string): string =>
  email.replace(/^mailto:/i, '').toLowerCase()

export function AttendeePopover({
  attendee,
  children,
  openOnHover = true
}: AttendeePopoverProps): React.ReactElement {
  const { t } = useI18n()
  const userEmail = useAppSelector(state => state.user.userData?.email)
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  const isSelf =
    !!userEmail &&
    normalizeEmail(attendee.cal_address) === normalizeEmail(userEmail)

  return (
    <>
      <ContactPopover
        name={attendee.cn ?? ''}
        email={attendee.cal_address}
        openOnHover={openOnHover}
        disabled={isSelf || attendee.cutype === 'RESOURCE'}
        onEmailCopy={() => setSnackbarOpen(true)}
      >
        {children}
        <ContactPopover.Actions>
          <AttendeeActions attendee={attendee} />
        </ContactPopover.Actions>
      </ContactPopover>
      <SnackbarAlert
        open={snackbarOpen}
        setOpen={setSnackbarOpen}
        message={t('tooltip.emailCopied')}
        sx={{ whiteSpace: 'nowrap' }}
      />
    </>
  )
}
