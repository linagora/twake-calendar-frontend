import { userAttendee } from '@common/features/User/models/attendee'
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Popper,
  Paper,
  useTheme,
  alpha
} from '@linagora/twake-mui'
import { ClickAwayListener } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { Tooltip } from '../Tooltip'
import { stringAvatar } from '../Event/utils/eventUtils'
import { SnackbarAlert } from '../Loading/SnackBarAlert'
import { AttendeeActions } from '@injected/components/Attendees/AttendeeActions'
import { useAppSelector } from '@common/app/hooks'

interface AttendeePopoverProps {
  attendee: userAttendee
  children: React.ReactElement
}

function AttendeeInfo({ attendee }: { attendee: userAttendee }): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          {...stringAvatar(attendee.cn || attendee.cal_address)}
          sx={{ width: 48, height: 48, fontSize: '1.25rem' }}
        />
        <Box sx={{ minWidth: 0 }}>
          {attendee.cn ? (
            <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
              {attendee.cn}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {attendee.cal_address}
            </Typography>
            <Tooltip title={t('tooltip.copyEmail')}>
              <IconButton
                size="small"
                onClick={() => {
                  void navigator.clipboard.writeText(attendee.cal_address)
                  setSnackbarOpen(true)
                }}
                sx={{ p: 0.5, color: alpha(theme.palette.grey[900], 0.9) }}
              >
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
      <SnackbarAlert
        open={snackbarOpen}
        setOpen={setSnackbarOpen}
        message={t('tooltip.emailCopied')}
        sx={{ whiteSpace: 'nowrap' }}
      />
    </>
  )
}

export function AttendeePopover({
  attendee,
  children
}: AttendeePopoverProps): React.ReactElement {
  const theme = useTheme()
  const userEmail = useAppSelector(state => state.user.userData?.email)

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  const normalizeEmail = (email: string): string =>
    email.replace(/^mailto:/i, '').toLowerCase()
  const isSelf =
    !!userEmail &&
    normalizeEmail(attendee.cal_address) === normalizeEmail(userEmail)

  if (isSelf || attendee.cutype === 'RESOURCE') {
    return <>{children}</>
  }

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        <div
          onClick={handleClick}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleClick(event as unknown as React.MouseEvent<HTMLElement>)
            }
          }}
          role="button"
          tabIndex={0}
          style={{
            display: 'inline-block',
            width: 'fit-content',
            cursor: 'pointer'
          }}
        >
          {children}
        </div>
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="right"
          style={{ zIndex: 1300 }}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 8]
              }
            }
          ]}
        >
          <Paper
            elevation={4}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              position: 'relative',
              minWidth: 320,
              borderRadius: 2
            }}
          >
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: alpha(theme.palette.grey[900], 0.9)
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <AttendeeInfo attendee={attendee} />
            <AttendeeActions attendee={attendee} />
          </Paper>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}
