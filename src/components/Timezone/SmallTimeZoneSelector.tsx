import { getTimezoneOffset, resolveTimezone } from '@/utils/timezone'
import {
  SwipeableDrawer,
  Box,
  TextField,
  List,
  InputAdornment
} from '@linagora/twake-mui'
import { Search as SearchIcon } from '@mui/icons-material'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTimeZoneList } from './hooks/useTimeZoneList'
import { TimezoneSelectProps } from './TimezoneSelector'
import { useI18n } from 'twake-i18n'
import { TimezoneListItem } from './TimezoneListItem'

const filterTimezones = (
  zones: string[],
  query: string,
  referenceDate: Date
): string[] => {
  if (!query) return zones
  return zones.filter(tz => {
    const label = tz.replace(/_/g, ' ').toLowerCase()
    const offset = getTimezoneOffset(tz, referenceDate).toLowerCase()
    return label.includes(query) || offset.includes(query)
  })
}

export const SmallTimezoneSelector: React.FC<
  TimezoneSelectProps & {
    onClose: () => void
    open: boolean
  }
> = ({ value, onChange, referenceDate, onClose, open }) => {
  const { t } = useI18n()

  const [searchQuery, setSearchQuery] = useState('')
  const timezoneList = useTimeZoneList()

  const effectiveTimezone = value
    ? resolveTimezone(value)
    : timezoneList.browserTz

  const filteredTimeZones = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return filterTimezones(timezoneList.zones, query, referenceDate)
  }, [timezoneList.zones, searchQuery, referenceDate])

  const handleSelect = (tz: string): void => {
    onChange(tz)
    setSearchQuery('')
    onClose()
  }

  const selectedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect((): void => {
    if (open) {
      inputRef.current?.focus()
      selectedRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'center'
      })
    }
  }, [open])

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={(): void => {}}
      disableAutoFocus
      slotProps={{
        paper: {
          sx: { height: '90%' }
        }
      }}
    >
      <Box sx={{ px: 2 }}>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          variant="standard"
          placeholder={t('calendar.searchTimezone')}
          value={searchQuery}
          onChange={(
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
          ) => setSearchQuery(e.target.value)}
          slotProps={{
            htmlInput: {
              'aria-label': t('calendar.searchTimezone')
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                </InputAdornment>
              ),
              disableUnderline: true
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              padding: '8px 0'
            }
          }}
        />
      </Box>
      <List sx={{ overflow: 'auto', flex: 1, pt: 0 }}>
        {filteredTimeZones.map(tz => (
          <TimezoneListItem
            key={tz}
            tz={tz}
            referenceDate={referenceDate}
            isSelected={effectiveTimezone === tz}
            onSelect={handleSelect}
            selectedRef={selectedRef}
          />
        ))}
      </List>
    </SwipeableDrawer>
  )
}
