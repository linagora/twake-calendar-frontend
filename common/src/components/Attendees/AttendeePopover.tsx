import { userAttendee } from '@common/features/User/models/attendee'
import { ContactPopover } from '@linagora/twake-mui'
import { Theme, ThemeProvider } from '@mui/material/styles'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SnackbarAlert } from '../Loading/SnackBarAlert'
import { AttendeeActions } from '@injected/components/Attendees/AttendeeActions'
import { useAppSelector } from '@common/app/hooks'

// MUI Popover's default marginThreshold
const VIEWPORT_MARGIN = 16

interface AttendeePopoverProps {
  attendee: userAttendee
  children: React.ReactElement
  openOnHover?: boolean
}

const normalizeEmail = (email: string): string =>
  email.replace(/^mailto:/i, '').toLowerCase()

// twake-mui's ContactPopover gives its card a fixed 320px minWidth, which
// pushes it past the left edge of screens narrower than 320px + 2 margins.
const withCardFittingViewport = (outerTheme: Theme): Theme => ({
  ...outerTheme,
  components: {
    ...outerTheme.components,
    MuiPopover: {
      ...outerTheme.components?.MuiPopover,
      styleOverrides: {
        ...outerTheme.components?.MuiPopover?.styleOverrides,
        paper: {
          '& > .MuiBox-root': {
            minWidth: `min(320px, calc(100vw - ${2 * VIEWPORT_MARGIN}px))`
          }
        }
      }
    }
  }
})

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
      <ThemeProvider theme={withCardFittingViewport}>
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
      </ThemeProvider>
      <SnackbarAlert
        open={snackbarOpen}
        setOpen={setSnackbarOpen}
        message={t('tooltip.emailCopied')}
        sx={{ whiteSpace: 'nowrap' }}
      />
    </>
  )
}
