import { getTimezoneOffset, resolveTimezone } from '@/utils/timezone'
import { Popover } from '@linagora/twake-mui'
import React, { useRef } from 'react'
import { TimezoneAutocomplete } from '../Timezone/TimezoneAutocomplete'
import { useTimeZoneList } from './hooks/useTimeZoneList'
import { TimezoneSelectProps } from './TimezoneSelector'

export const LargeTimezoneSelector: React.FC<
  TimezoneSelectProps & {
    onClose: () => void
    open: boolean
    anchorEl?: HTMLElement | null
  }
> = ({ value, onChange, referenceDate, onClose, open, anchorEl }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const timezoneList = useTimeZoneList()

  const effectiveTimezone = value
    ? resolveTimezone(value)
    : timezoneList.browserTz

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left'
      }}
      slotProps={{
        paper: {
          sx: { width: 280, maxHeight: 400, overflow: 'hidden', p: 0 }
        },
        transition: {
          onEntered: () => {
            inputRef.current?.focus()
          }
        }
      }}
    >
      <TimezoneAutocomplete
        size="medium"
        value={effectiveTimezone}
        onChange={onChange}
        zones={timezoneList.zones}
        getTimezoneOffset={(tzName: string) =>
          getTimezoneOffset(tzName, referenceDate)
        }
        inputRef={inputRef}
        openOnFocus
        showIcon={false}
        inputFontSize="14px"
        inputPadding="2px 4px"
        onClose={onClose}
        disableClearable={true}
      />
    </Popover>
  )
}
