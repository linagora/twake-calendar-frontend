import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setTimeZone as setSettingsTimeZone } from '@common/features/Settings/SettingsSlice'
import {
  setTimezone as setUserTimeZone,
  updateUserConfigurations
} from '@common/features/User/UserSlice'
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
import React, { useEffect, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { getTimezoneOffset } from '@common/utils/timezone'
import { useDetectedTimeZoneSync } from './hooks/useDetectedTimeZoneSync'

export const TimezoneChangeAlert: React.FC = () => {
  const dispatch = useAppDispatch()
  const { t } = useI18n()

  // The detection never prompts: it keeps the backend in step on its own.
  useDetectedTimeZoneSync()

  // While the detection is on the settings already follow the browser, so the
  // stored configuration must not be read back: it may hold a zone the user
  // pinned long ago, or the fallback the backend serves to unconfigured users.
  const pinnedTZ = useAppSelector(state =>
    state.settings?.isBrowserDefaultTimeZone
      ? null
      : state.user?.coreConfig?.datetime?.timeZone
  )
  const settingsTZ = useAppSelector(state => state.settings?.timeZone)
  const configuredTZ = pinnedTZ ?? settingsTZ
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

  return (
    <Dialog open={open} onClose={handleDecline} maxWidth="xs" fullWidth>
      <DialogTitle>{t('settings.tzPrompt.title')}</DialogTitle>
      <DialogContent>
        <Typography>
          {t('settings.tzPrompt.detected', { browserTZ })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDecline} variant="outlined" color="secondary">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleAccept} variant="contained">
          {t('actions.update')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TimezoneChangeAlert
