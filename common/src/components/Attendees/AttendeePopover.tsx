import { userAttendee } from '@common/features/User/models/attendee'
import {
  Avatar,
  Box,
  Button,
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
import { Icon, CalendarToday, EmailOpen } from '@linagora/twake-icons'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { resolveMailSpaUrl } from '@common/utils/mailUrlUtils'
import { Tooltip } from '../Tooltip'
import { stringAvatar } from '../Event/utils/eventUtils'
import { SnackbarAlert } from '../Loading/SnackBarAlert'

interface AttendeePopoverProps {
  attendee: userAttendee
  children: React.ReactElement
  isPublic?: boolean
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

function AttendeeActions({
  attendee,
  isPublic
}: {
  attendee: userAttendee
  isPublic?: boolean
}): JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()

  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const userEmail = useAppSelector(state => state.user.userData?.email)
  const mailSpaUrl = resolveMailSpaUrl({
    localpart: userEmail?.split('@')[0],
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
      {!isPublic && (
        <Tooltip title={t('tooltip.createEvent')}>
          <IconButton
            onClick={() => {
              window.open(
                `/newEvent?attendee=${encodeURIComponent(attendee.cal_address)}`,
                '_self'
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
      )}
    </Box>
  )
}

export function AttendeePopover({
  attendee,
  children,
  isPublic
}: AttendeePopoverProps): React.ReactElement {
  const theme = useTheme()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  if (attendee.role === 'CHAIR' || attendee.cutype === 'RESOURCE') {
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
            <AttendeeActions attendee={attendee} isPublic={isPublic} />
          </Paper>
        </Popper>
      </div>
    </ClickAwayListener>
  )
}
