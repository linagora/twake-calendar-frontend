import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setTimeZone as setSettingsTimeZone } from '@common/features/Settings/SettingsSlice'
import {
  setTimezone as setUserTimeZone,
  updateUserConfigurations
} from '@common/features/User/UserSlice'
import { Alert, Box, Button, Snackbar, Typography } from '@linagora/twake-mui'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { getTimezoneOffset } from '@common/utils/timezone'

export const TimezoneChangeAlert: React.FC = () => {
  const dispatch = useAppDispatch()
  const { t } = useI18n()

  const configuredTZ = useAppSelector(
    state =>
      state.user?.coreConfig?.datetime?.timeZone ?? state.settings?.timeZone
  )
  const previousConfig = useAppSelector(state => state.user?.coreConfig)

  const [open, setOpen] = useState(false)
  const [browserTZ, setBrowserTZ] = useState('')

  useEffect(() => {
    const openTimezoneChangeAlert = (): void => {
      if (!window.ASK_FOR_TZ_UPDATE) return

      const currentBrowserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone
      setBrowserTZ(currentBrowserTZ)

      const lastCheckedTZ = localStorage.getItem('lastCheckedTZ')

      const getSafeTimezoneOffset = (tz: string | null | undefined): string => {
        if (!tz) return ''
        try {
          return getTimezoneOffset(tz)
        } catch {
          return ''
        }
      }

      const browserOffset = getSafeTimezoneOffset(currentBrowserTZ)
      const lastCheckedOffset = getSafeTimezoneOffset(lastCheckedTZ)
      const configuredOffset = getSafeTimezoneOffset(configuredTZ)

      const hasTimezoneChanged = browserOffset !== lastCheckedOffset
      const shouldPrompt = browserOffset !== configuredOffset

      if (hasTimezoneChanged && shouldPrompt) {
        setOpen(true)
      }
    }
    openTimezoneChangeAlert()
  }, [configuredTZ])

  const handleAccept = (): void => {
    const previousTimeZone = configuredTZ
    dispatch(setUserTimeZone(browserTZ))
    dispatch(setSettingsTimeZone(browserTZ))
    dispatch(updateUserConfigurations({ timezone: browserTZ, previousConfig }))
      .unwrap()
      .catch(() => {
        // Rollback on error
        if (previousTimeZone) {
          dispatch(setUserTimeZone(previousTimeZone))
          dispatch(setSettingsTimeZone(previousTimeZone))
        }
      })

    localStorage.setItem('lastCheckedTZ', browserTZ)
    setOpen(false)
  }

  const handleDecline = (): void => {
    localStorage.setItem('lastCheckedTZ', browserTZ)
    setOpen(false)
  }

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ): void => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="info" sx={{ width: '100%' }}>
        <Box>
          <Typography>
            {t('settings.tzPrompt.detected', {
              browserTZ,
              configuredTZ: configuredTZ || ''
            })}
          </Typography>
          <Typography>
            {t('settings.tzPrompt.askSwitch', { browserTZ })}
          </Typography>
        </Box>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '8px'
          }}
        >
          <Button color="inherit" size="small" onClick={handleAccept}>
            {t('common.ok')}
          </Button>
          <Button color="inherit" size="small" onClick={handleDecline}>
            {t('common.cancel')}
          </Button>
        </div>
      </Alert>
    </Snackbar>
  )
}

export default TimezoneChangeAlert
