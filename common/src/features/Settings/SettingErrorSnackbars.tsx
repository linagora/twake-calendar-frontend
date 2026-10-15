import { Snackbar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import './SettingsPage.styl'

export const SettingErrorSnackbars: React.FC<{
  languageErrorOpen: boolean
  themeErrorOpen: boolean
  timeZoneErrorOpen: boolean
  alarmEmailsErrorOpen: boolean
  hideDeclinedEventsErrorOpen: boolean
  displayWeekNumbersErrorOpen: boolean
  workingDaysErrorOpen: boolean
  handleLanguageErrorClose: () => void
  handleThemeErrorClose: () => void
  handleTimeZoneErrorClose: () => void
  handleAlarmEmailsErrorClose: () => void
  handleHideDeclinedEventsErrorClose: () => void
  handleDisplayWeekNumbersErrorClose: () => void
  setWorkingDaysErrorOpen: (open: boolean) => void
}> = ({
  languageErrorOpen,
  themeErrorOpen,
  timeZoneErrorOpen,
  alarmEmailsErrorOpen,
  hideDeclinedEventsErrorOpen,
  displayWeekNumbersErrorOpen,
  workingDaysErrorOpen,
  handleLanguageErrorClose,
  handleThemeErrorClose,
  handleTimeZoneErrorClose,
  handleAlarmEmailsErrorClose,
  handleHideDeclinedEventsErrorClose,
  handleDisplayWeekNumbersErrorClose,
  setWorkingDaysErrorOpen
}) => {
  const { t } = useI18n()

  return (
    <>
      <Snackbar
        open={languageErrorOpen}
        autoHideDuration={4000}
        onClose={handleLanguageErrorClose}
        message={
          t('settings.languageUpdateError') || 'Failed to update language'
        }
      />
      <Snackbar
        open={themeErrorOpen}
        autoHideDuration={4000}
        onClose={handleThemeErrorClose}
        message={t('settings.themeUpdateError')}
      />
      <Snackbar
        open={timeZoneErrorOpen}
        autoHideDuration={4000}
        onClose={handleTimeZoneErrorClose}
        message={t('settings.timeZoneUpdateError')}
      />
      <Snackbar
        open={alarmEmailsErrorOpen}
        autoHideDuration={4000}
        onClose={handleAlarmEmailsErrorClose}
        message={
          t('settings.alarmEmailsUpdateError') ||
          'Failed to update email notifications setting'
        }
      />
      <Snackbar
        open={hideDeclinedEventsErrorOpen}
        autoHideDuration={4000}
        onClose={handleHideDeclinedEventsErrorClose}
        message={t('settings.hideDeclinedEventsUpdateError')}
      />
      <Snackbar
        open={displayWeekNumbersErrorOpen}
        autoHideDuration={4000}
        onClose={handleDisplayWeekNumbersErrorClose}
        message={t('settings.displayWeekNumbersUpdateError')}
      />
      <Snackbar
        open={workingDaysErrorOpen}
        autoHideDuration={4000}
        onClose={() => setWorkingDaysErrorOpen(false)}
        message={t('settings.workingDaysUpdateError')}
      />
    </>
  )
}
