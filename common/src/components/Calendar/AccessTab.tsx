import {
  fetchCalendarExport,
  fetchSecretLink
} from '@common/features/Calendars/CalendarDAO'
import { Calendar } from '@common/types/CalendarTypes'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from '@linagora/twake-mui'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { FieldWithLabel } from '@common/components/Event/components/FieldWithLabel'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { CalendarAccessRights, UserWithAccess } from './CalendarAccessRights'

interface AccessTabProps {
  calendar: Calendar
  usersWithAccess: UserWithAccess[]
  onUsersWithAccessChange: (users: UserWithAccess[]) => void
  onInvitesLoaded: (users: UserWithAccess[]) => void
}

export function AccessTab({
  calendar,
  usersWithAccess,
  onUsersWithAccessChange,
  onInvitesLoaded
}: AccessTabProps) {
  const { t } = useI18n()

  const calDAVLink = `${window.DAV_BASE_URL}${calendar.link.replace('.json', '')}`

  const isResource = useMemo(
    () => calendar?.owner?.resource,
    [calendar?.owner?.resource]
  )

  const [secretLink, setSecretLink] = useState('')
  const [open, setOpen] = useState(false)

  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    async function fetchSecret() {
      try {
        const existing = await fetchSecretLink(
          calendar.link.replace('.json', ''),
          false
        )
        setSecretLink(existing.secretLink)
      } catch (e) {
        console.error(e)
        setExportError((e as Error).message)
      }
    }
    fetchSecret()
  }, [calendar.link])

  const handleResetSecretLink = async () => {
    try {
      const newSecret = await fetchSecretLink(
        calendar.link.replace('.json', ''),
        true
      )
      setSecretLink(newSecret.secretLink)
    } catch (e) {
      console.error(e)
      setExportError((e as Error).message)
    }
  }

  const handleExport = async () => {
    try {
      setExportLoading(true)
      const exportedData = await fetchCalendarExport(
        calendar.link.replace('.json', '')
      )
      const blob = new Blob([exportedData], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${calendar.id.split('/')[1]}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError((e as Error).message)
    } finally {
      setExportLoading(false)
    }
  }

  function handleCopyLink(
    arg0: URL,
    setOpen: Dispatch<SetStateAction<boolean>>
  ): void {
    throw new Error('Function not implemented.')
  }

  return (
    <>
      <CalendarAccessRights
        calendar={calendar}
        value={usersWithAccess}
        onChange={onUsersWithAccessChange}
        onInvitesLoaded={onInvitesLoaded}
      />

      {!!window.DAV_BASE_URL && !isResource && (
        <FieldWithLabel label={t('calendar.caldav_access')} isExpanded={false}>
          <Box sx={{ mt: 2 }}>
            <TextField
              disabled
              fullWidth
              label=""
              value={calDAVLink}
              size="small"
              slotProps={{
                input: {
                  'aria-label': t('calendar.caldav_access'),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          handleCopyLink(new URL(calDAVLink), setOpen)
                        }
                        edge="end"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Box>
        </FieldWithLabel>
      )}

      <FieldWithLabel label={t('calendar.secretUrl')} isExpanded={false}>
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            disabled
            fullWidth
            label=""
            value={secretLink}
            size="small"
            slotProps={{
              input: {
                'aria-label': t('calendar.secretUrl'),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        handleCopyLink(new URL(secretLink), setOpen)
                      }
                      edge="end"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleResetSecretLink}
            sx={{ borderRadius: '4px' }}
          >
            {t('actions.reset')}
          </Button>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.5 }}
        >
          {t('calendar.secretUrlDesc')}
        </Typography>
      </FieldWithLabel>

      <FieldWithLabel label={t('calendar.exportCalendar')} isExpanded={false}>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', my: 1, lineHeight: 1.5 }}
        >
          {t('calendar.exportDesc')}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleExport}
          startIcon={!exportLoading && <FileDownloadOutlinedIcon />}
          disabled={exportLoading}
          sx={{ borderRadius: '4px' }}
        >
          {exportLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              {t('actions.exporting')}
            </Box>
          ) : (
            t('actions.export')
          )}
        </Button>
      </FieldWithLabel>

      <SnackbarAlert
        setOpen={setOpen}
        open={open}
        message={t('common.link_copied')}
      />
      <ErrorSnackbar error={exportError} type="calendar" />
    </>
  )
}
