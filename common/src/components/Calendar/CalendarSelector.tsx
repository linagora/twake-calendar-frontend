import React, { useRef } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { InputLabel, MenuItem, Select, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CalendarItemList } from './CalendarItemList'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@common/components/MobileSelector'
import { CalendarName } from './CalendarName'

export const CalendarSelector: React.FC<{
  userId: string
  importTarget: string
  setImportTarget: (target: string) => void
}> = ({ userId, importTarget, setImportTarget }) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const calendars = useAppSelector(state => state.calendars.list)
  // Every calendar the import may write into: the user's own ones and those
  // delegated to them with a write right.
  const writableCalendars = useUserPersonalCalendars(calendars, userId)

  const selectorRef = useRef<MobileSelectorHandle>(null)
  const selectedCalendar = writableCalendars.find(
    cal => cal.id === importTarget
  )

  const handleMobileSelectCalendar = (calendarId: string): void => {
    setImportTarget(calendarId)
    selectorRef.current?.onClose()
  }

  if (isMobile) {
    return (
      <>
        <Typography
          component="p"
          variant="h6"
          sx={{ margin: 0, marginBottom: 1 }}
        >
          {t('calendar.import_to')}
        </Typography>
        <MobileSelector
          ref={selectorRef}
          displayText={
            importTarget === 'new' ? (
              t('calendar.new_calendar')
            ) : selectedCalendar ? (
              <CalendarName calendar={selectedCalendar} />
            ) : null
          }
        >
          <MenuItem
            value="new"
            onClick={() => handleMobileSelectCalendar('new')}
          >
            {t('calendar.new_calendar')}
          </MenuItem>
          {CalendarItemList(writableCalendars, handleMobileSelectCalendar)}
        </MobileSelector>
      </>
    )
  }

  return (
    <>
      <InputLabel id="import-to-label">{t('calendar.import_to')}</InputLabel>
      <Select
        labelId="import-to-label"
        label={t('calendar.import_to')}
        value={importTarget}
        onChange={e => setImportTarget(e.target.value)}
      >
        <MenuItem value="new">{t('calendar.new_calendar')}</MenuItem>
        {CalendarItemList(writableCalendars)}
      </Select>
    </>
  )
}
