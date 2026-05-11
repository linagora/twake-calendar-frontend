import React, { useRef } from 'react'
import { useAppSelector } from '@/app/hooks'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { InputLabel, MenuItem, Select, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CalendarItemList } from './CalendarItemList'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { MobileSelector, MobileSelectorHandle } from '../MobileSelector'
import { CalendarName } from './CalendarName'

export const CalendarSelector: React.FC<{
  userId: string
  importTarget: string
  setImportTarget: (target: string) => void
}> = ({ userId, importTarget, setImportTarget }) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const calendars = useAppSelector(state => state.calendars.list)
  const personalCalendars = Object.values(calendars).filter(
    cal => extractEventBaseUuid(cal.id) === userId
  )

  const selectorRef = useRef<MobileSelectorHandle>(null)
  const selectedCalendar = personalCalendars.find(
    cal => cal.id === importTarget
  )

  const handleMobileSelectCalendar = (calendarId: string): void => {
    setImportTarget(calendarId)
    selectorRef.current?.onClose()
  }

  if (isMobile) {
    return (
      <>
        <Typography variant="h6" sx={{ margin: 0, marginBottom: 1 }}>
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
          {CalendarItemList(personalCalendars, handleMobileSelectCalendar)}
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
        {CalendarItemList(personalCalendars)}
      </Select>
    </>
  )
}
