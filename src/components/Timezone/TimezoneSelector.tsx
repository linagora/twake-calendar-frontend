import { getTimezoneOffset, resolveTimezone } from '@/utils/timezone'
import { Button } from '@linagora/twake-mui'
import { MouseEvent, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useTimeZoneList } from './hooks/useTimeZoneList'
import { LargeTimezoneSelector } from './LargeTimeZoneSelector'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { SmallTimezoneSelector } from './SmallTimeZoneSelector'

export interface TimezoneSelectProps {
  value: string
  onChange: (value: string) => void
  referenceDate: Date
}

export const TimezoneSelector: React.FC<TimezoneSelectProps> = ({
  value,
  onChange,
  referenceDate
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const timezoneList = useTimeZoneList()

  const effectiveTimezone = value
    ? resolveTimezone(value)
    : timezoneList.browserTz
  const safeTimezone = timezoneList.zones.includes(effectiveTimezone)
    ? effectiveTimezone
    : timezoneList.browserTz
  const selectedOffset = getTimezoneOffset(safeTimezone, referenceDate)

  const handleOpen = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  const { t } = useI18n()
  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={handleOpen}
        sx={{
          textTransform: 'none',
          minWidth: 'auto',
          padding: '2px 4px',
          margin: 0,
          lineHeight: 1.2
        }}
      >
        {selectedOffset || t('common.select_timezone')}
      </Button>

      {isMobile ? (
        <SmallTimezoneSelector
          value={value}
          onChange={onChange}
          referenceDate={referenceDate}
          onClose={handleClose}
          open={open}
        />
      ) : (
        <LargeTimezoneSelector
          value={value}
          onChange={onChange}
          referenceDate={referenceDate}
          onClose={handleClose}
          open={open}
          anchorEl={anchorEl}
        />
      )}
    </>
  )
}
