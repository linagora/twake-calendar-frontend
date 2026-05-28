import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { Box, SxProps, Theme } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface WeekDaySelectorProps {
  selectedDays: number[] // FullCalendar format: 0=Sun, 1=Mon...
  onChange: (days: number[]) => void
  disabled?: boolean
}

export const FC_DAYS = [
  { fc: 1, ics: 'MO' },
  { fc: 2, ics: 'TU' },
  { fc: 3, ics: 'WE' },
  { fc: 4, ics: 'TH' },
  { fc: 5, ics: 'FR' },
  { fc: 6, ics: 'SA' },
  { fc: 0, ics: 'SU' }
]

const WeekDayStyle = (
  isSelected: boolean,
  isMobile: boolean,
  disabled?: boolean
): SxProps<Theme> => {
  const desktopStyle = {
    width: 40,
    height: 40,
    borderRadius: '4px',
    border: '1px solid',
    borderColor: isSelected ? 'primary.main' : '#AEAEC0',
    color: isSelected ? '#fff' : '#8C9CAF',
    fontSize: 16,
    fontWeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: isSelected ? 'primary.main' : 'transparent',
    cursor: disabled ? 'default' : 'pointer',
    '@media (hover: hover)': {
      '&:hover': !disabled
        ? {
            borderColor: 'primary.main',
            bgcolor: 'primary.main',
            color: '#fff'
          }
        : undefined
    }
  } as SxProps<Theme>

  if (isMobile) {
    return {
      ...desktopStyle,
      width: 200,
      justifyContent: 'start',
      padding: 1
    }
  }

  return desktopStyle
}

export const WeekDaySelector: React.FC<WeekDaySelectorProps> = ({
  selectedDays,
  onChange,
  disabled
}) => {
  const { t } = useI18n()

  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const getDayLabel = (ics: string, fullLabel: boolean): string => {
    const weekdayKey = fullLabel ? 'fullDays' : 'days'
    const dayMap: Record<string, string> = {
      MO: t(`event.repeat.${weekdayKey}.monday`),
      TU: t(`event.repeat.${weekdayKey}.tuesday`),
      WE: t(`event.repeat.${weekdayKey}.wednesday`),
      TH: t(`event.repeat.${weekdayKey}.thursday`),
      FR: t(`event.repeat.${weekdayKey}.friday`),
      SA: t(`event.repeat.${weekdayKey}.saturday`),
      SU: t(`event.repeat.${weekdayKey}.sunday`)
    }
    return dayMap[ics] || ics
  }

  const handleToggle = (fcDay: number): void => {
    if (disabled) return
    const updated = selectedDays.includes(fcDay)
      ? selectedDays.filter(d => d !== fcDay)
      : [...selectedDays, fcDay]
    onChange(updated)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 1
      }}
    >
      {FC_DAYS.map(({ fc, ics }) => {
        const isSelected = selectedDays.includes(fc)
        const fullLabel = getDayLabel(ics, isMobile)

        return (
          <Box
            component="button"
            type="button"
            key={ics}
            aria-label={fullLabel}
            aria-pressed={isSelected}
            onClick={() => handleToggle(fc)}
            disabled={disabled}
            sx={WeekDayStyle(isSelected, isMobile, disabled)}
          >
            {isMobile ? fullLabel : fullLabel.charAt(0)}
          </Box>
        )
      })}
    </Box>
  )
}
