import { getTimezoneOffset, resolveTimezone } from '@/utils/timezone'
import {
  SwipeableDrawer,
  Box,
  TextField,
  List,
  InputAdornment,
  styled
} from '@linagora/twake-mui'
import { Search as SearchIcon } from '@mui/icons-material'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTimeZoneList } from './hooks/useTimeZoneList'
import { TimezoneSelectProps } from './TimezoneSelector'
import { useI18n } from 'twake-i18n'
import { TimezoneListItem } from './TimezoneListItem'

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

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
  const paperRef = useRef<HTMLDivElement>(null)

  useEffect((): (() => void) | void => {
    if (!open) return

    const viewport = window.visualViewport

    const paper = paperRef.current

    const adjustForKeyboard = (): void => {
      if (!paper || !viewport) return

      // viewport.offsetTop > 0 means iOS has scrolled the page to reveal the
      // focused element (triggered by programmatic focus). When the user taps
      // manually, the keyboard floats over content without scrolling the page,
      // so offsetTop stays 0 and we should not resize the drawer.
      if (viewport.offsetTop <= 0) {
        paper.style.bottom = ''
        paper.style.height = ''
        return
      }

      const bottom = Math.max(
        0,
        window.innerHeight - viewport.offsetTop - viewport.height
      )
      paper.style.bottom = `${bottom}px`
      paper.style.height = `${viewport.height - 70}px`
    }

    if (viewport) {
      // Register before calling focus so the listener fires as the keyboard opens.
      viewport.addEventListener('resize', adjustForKeyboard)
      viewport.addEventListener('scroll', adjustForKeyboard)
    }

    inputRef.current?.focus()
    selectedRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })

    return (): void => {
      if (viewport) {
        viewport.removeEventListener('resize', adjustForKeyboard)
        viewport.removeEventListener('scroll', adjustForKeyboard)
      }
      if (paper) {
        paper.style.bottom = ''
        paper.style.height = ''
      }
    }
  }, [open])

  return (
    <StyledSwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={(): void => {}}
      disableAutoFocus
      slotProps={{
        paper: {
          ref: paperRef,
          sx: { height: '90%', maxHeight: '90dvh' }
        }
      }}
    >
      <Box sx={{ px: 2 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="medium"
          variant="standard"
          placeholder={t('calendar.searchTimezone')}
          value={searchQuery}
          onChange={(
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
          ) => setSearchQuery(e.target.value)}
          slotProps={{
            htmlInput: {
              'aria-label': t('calendar.searchTimezone'),
              autoComplete: 'off',
              inputMode: 'search',
              enterKeyHint: 'search'
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
    </StyledSwipeableDrawer>
  )
}
