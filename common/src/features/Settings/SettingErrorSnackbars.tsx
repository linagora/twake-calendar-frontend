import { Snackbar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import './SettingsPage.styl'
import { useMessageDuration } from '@common/components/Loading/useMessageDuration'

export const SettingErrorSnackbars: React.FC<{
  languageErrorOpen: boolean
  timeZoneErrorOpen: boolean
  alarmEmailsErrorOpen: boolean
  hideDeclinedEventsErrorOpen: boolean
  displayWeekNumbersErrorOpen: boolean
  workingDaysErrorOpen: boolean
  handleLanguageErrorClose: () => void
  handleTimeZoneErrorClose: () => void
  handleAlarmEmailsErrorClose: () => void
  handleHideDeclinedEventsErrorClose: () => void
  handleDisplayWeekNumbersErrorClose: () => void
  setWorkingDaysErrorOpen: (open: boolean) => void
}> = ({
  languageErrorOpen,
  timeZoneErrorOpen,
  alarmEmailsErrorOpen,
  hideDeclinedEventsErrorOpen,
  displayWeekNumbersErrorOpen,
  workingDaysErrorOpen,
  handleLanguageErrorClose,
  handleTimeZoneErrorClose,
  handleAlarmEmailsErrorClose,
  handleHideDeclinedEventsErrorClose,
  handleDisplayWeekNumbersErrorClose,
  setWorkingDaysErrorOpen
}) => {
  const { t } = useI18n()
  const errorDuration = useMessageDuration(4000, 'error')

  return (
    <>
      <Snackbar
        open={languageErrorOpen}
        autoHideDuration={errorDuration}
        onClose={handleLanguageErrorClose}
        message={
          t('settings.languageUpdateError') || 'Failed to update language'
        }
      />
      <Snackbar
        open={timeZoneErrorOpen}
        autoHideDuration={errorDuration}
        onClose={handleTimeZoneErrorClose}
        message={t('settings.timeZoneUpdateError')}
      />
      <Snackbar
        open={alarmEmailsErrorOpen}
        autoHideDuration={errorDuration}
        onClose={handleAlarmEmailsErrorClose}
        message={
          t('settings.alarmEmailsUpdateError') ||
          'Failed to update email notifications setting'
        }
      />
      <Snackbar
        open={hideDeclinedEventsErrorOpen}
        autoHideDuration={errorDuration}
        onClose={handleHideDeclinedEventsErrorClose}
        message={t('settings.hideDeclinedEventsUpdateError')}
      />
      <Snackbar
        open={displayWeekNumbersErrorOpen}
        autoHideDuration={errorDuration}
        onClose={handleDisplayWeekNumbersErrorClose}
        message={t('settings.displayWeekNumbersUpdateError')}
      />
      <Snackbar
        open={workingDaysErrorOpen}
        autoHideDuration={errorDuration}
        onClose={() => setWorkingDaysErrorOpen(false)}
        message={t('settings.workingDaysUpdateError')}
      />
    </>
  )
}
