import React from 'react'
import { Box, CircularProgress, Empty } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import logo from '@common/static/noResult-logo.svg'

// The period FullCalendar displays, as its datesSet hands it over: the end is
// exclusive
export interface NoEventsPeriod {
  start: Date
  end: Date
}

export interface NoEventsContentProps {
  isPending: boolean
  period?: NoEventsPeriod | null
  timezone?: string
}

// The first and last days of the period, as "19 October" and "25 October"
export const formatNoEventsPeriod = (
  period: NoEventsPeriod,
  locale: string,
  timezone?: string
): { start: string; end: string } => {
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    // Read the dates in the calendar timezone: the period boundaries are
    // midnights there, not in the browser timezone
    ...(timezone && timezone !== 'local' ? { timeZone: timezone } : {})
  })

  return {
    start: format.format(period.start),
    end: format.format(new Date(period.end.getTime() - 1))
  }
}

export const NoEventsContent: React.FC<NoEventsContentProps> = ({
  isPending,
  period,
  timezone
}) => {
  const { t } = useI18n()

  const text = period
    ? t(
        'event.noEventsInPeriod',
        formatNoEventsPeriod(period, t('locale'), timezone)
      )
    : t('event.noEventsToDisplay')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        padding: '24px'
      }}
    >
      {isPending ? (
        <CircularProgress size={24} />
      ) : (
        <Empty
          icon={
            <img
              src={logo}
              alt={t('event.noEventsToDisplay')}
              width={100}
              height={80}
            />
          }
          iconSize="normal"
          text={text}
        />
      )}
    </Box>
  )
}
