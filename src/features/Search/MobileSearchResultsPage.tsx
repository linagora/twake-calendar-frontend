import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { AppDispatch } from '@/app/store'
import {
  getBestColor,
  getTitleStyle
} from '@/components/Event/EventChip/EventChipUtils'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import EventPreviewModal from '@/features/Events/EventPreview'
import { browserDefaultTimeZone } from '@/utils/timezone'
import {
  Box,
  Card,
  CardHeader,
  CircularProgress,
  Stack,
  Typography
} from '@linagora/twake-mui'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import logo from '../../static/noResult-logo.svg'
import { getEventAsync } from '../Calendars/services'
import { CalendarEvent } from '../Events/EventsTypes'
import { AttendeesFilter } from './AttendeesFilter'
import { OrganizersFilter } from './OrganizersFilter'
import { SearchInFilter } from './SearchInFilter'
import './searchResult.styl'
import { SearchEventResult } from './types/SearchEventResult'

const MobileSearchResultsPage: React.FC = () => {
  const searchResults = useAppSelector(state => state.searchResult)
  const hasSearchParams =
    searchResults.searchParams.search !== '' ||
    searchResults.searchParams.filters.keywords !== '' ||
    searchResults.searchParams.filters.organizers.length > 0 ||
    searchResults.searchParams.filters.attendees.length > 0

  const displaySearch =
    (!!searchResults.hits || !!searchResults.error || searchResults.loading) &&
    hasSearchParams

  return (
    <>
      <FiltersButtons />
      {displaySearch && <Results />}
    </>
  )
}

export default MobileSearchResultsPage

const FiltersButtons: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        overflowX: 'auto',
        gap: 2,
        px: 2,
        py: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        backgroundColor: '#FFF',
        minHeight: '48px'
      }}
    >
      <SearchInFilter mode="mobile" />
      <OrganizersFilter mode="mobile" />
      <AttendeesFilter mode="mobile" />
    </Box>
  )
}

type NormalizedColor = { light: string; dark: string }

type NormalizedCalendar = Omit<Calendar, 'color'> & { color: NormalizedColor }

/**
 * EventChip expects calendar.color to be { light: string; dark: string }.
 * The Redux store may hold color as a plain string — normalize it here
 * so EventChip's getBestColor receives the right shape.
 */
function normalizeCalendarColor(color: Calendar['color']): NormalizedColor {
  if (
    color &&
    typeof color === 'object' &&
    'light' in color &&
    'dark' in color
  ) {
    return color as NormalizedColor
  }
  const hex = typeof color === 'string' ? color : '#ffffff'
  return { light: hex, dark: hex }
}

/**
 * Returns a copy of the calendars map with every color normalized to
 * { light, dark } so EventChip never receives a raw string color.
 */
function normalizeCalendars(
  calendars: Record<string, Calendar>
): Record<string, NormalizedCalendar> {
  const result: Record<string, NormalizedCalendar> = {}
  for (const [key, cal] of Object.entries(calendars)) {
    result[key] = { ...cal, color: normalizeCalendarColor(cal.color) }
  }
  return result
}

function Results() {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { error, loading, hits, results } = useAppSelector(
    state => state.searchResult
  )

  return (
    <Box className="search-layout">
      {loading && (
        <Box className="loading">
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && error && (
        <Box className="error">
          <Typography className="error-text">{error}</Typography>
        </Box>
      )}

      {!loading && !error && !hits && (
        <Box className="noResults">
          <img className="logo" src={logo} alt={t('search.noResults')} />
          <Typography variant="h5">{t('search.noResults')}</Typography>
          <Typography variant="subtitle1">
            {t('search.noResultsSubtitle')}
          </Typography>
        </Box>
      )}

      {!loading && !error && !!hits && (
        <Box className="search-result-content-body">
          <Stack>
            {results.map((result: SearchEventResult, idx: number) => (
              <ResultItem
                key={`row-${idx}-event-${result.data.uid}`}
                eventData={result}
                dispatch={dispatch}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

function ResultItem({
  eventData,
  dispatch
}: {
  eventData: SearchEventResult
  dispatch: AppDispatch
}) {
  const { t } = useI18n()
  const [openPreview, setOpenPreview] = useState(false)

  const timeZone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone

  const rawCalendars = useAppSelector(state => state.calendars.list)
  const calendars = normalizeCalendars(rawCalendars)

  const calId = `${eventData.data.userId}/${eventData.data.calendarId}`
  const calendar = calendars[calId]

  const startDate = new Date(eventData.data.start)

  const handleOpen = async (): Promise<void> => {
    if (!calendar) return
    const event: CalendarEvent = {
      URL: eventData._links.self.href,
      calId: calendar.id,
      uid: eventData.data.uid,
      start: eventData.data.start,
      end: eventData.data.end,
      allday: eventData.data.allDay,
      attendee: eventData.data.attendees,
      class: eventData.data.class,
      description: eventData.data.description,
      stamp: eventData.data.dtstamp,
      location: eventData.data.location,
      organizer: eventData.data.organizer,
      title: eventData.data.summary,
      timezone: timeZone
    }
    await dispatch(getEventAsync(event))
    setOpenPreview(true)
  }

  const bestColor = getBestColor(calendar.color)

  const titleStyle = getTitleStyle(bestColor, 'ACCEPTED', calendar, false)

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '10%',
          gridAutoFlow: 'column',
          gap: 2,
          pt: 1,
          cursor: 'pointer',
          alignItems: 'center',
          textAlign: 'left',
          '&:hover': { backgroundColor: '#e7e7e7ff' }
        }}
        onClick={handleOpen}
      >
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 400 }}>
            {startDate.toLocaleDateString(t('locale'), {
              day: '2-digit',
              timeZone
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {startDate
              .toLocaleDateString(t('locale'), {
                weekday: 'short',
                timeZone
              })
              .toUpperCase()}
          </Typography>
        </Box>

        <Card
          variant="outlined"
          sx={{
            height: 'stretch',
            width: '100%',
            borderRadius: '8px',
            p: 1,
            boxShadow: 'none',
            backgroundColor: calendar.color.light,
            color: calendar.color.dark,
            border: '1px solid white',
            display: 'flex'
          }}
          data-testid={`event-card-${eventData.data.uid}`}
        >
          <CardHeader
            sx={{
              p: '0px',
              '& .MuiCardHeader-content': {
                overflow: 'hidden'
              }
            }}
            title={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    minWidth: 0
                  }}
                >
                  <Typography variant="body2" noWrap style={titleStyle}>
                    {eventData.data.summary || t('event.untitled')}
                  </Typography>
                </Box>
              </Box>
            }
            subheader={
              !eventData.data.allDay && (
                <Typography
                  style={{
                    color: titleStyle.color,
                    opacity: '70%',
                    fontFamily: 'Inter',
                    fontWeight: '500',
                    fontSize: '10px',
                    lineHeight: '16px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle'
                  }}
                >
                  {startDate.toLocaleTimeString(t('locale'), {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone
                  })}
                </Typography>
              )
            }
          />
        </Card>
      </Box>

      {calendar && calendar.events?.[eventData.data.uid] && (
        <EventPreviewModal
          eventId={eventData.data.uid}
          calId={calendar.id}
          open={openPreview}
          onClose={() => setOpenPreview(false)}
        />
      )}
    </>
  )
}
