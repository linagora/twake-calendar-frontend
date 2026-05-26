import { CALENDAR_VIEWS } from '@/components/Calendar/utils/constants'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography
} from '@linagora/twake-mui'
import { useRef } from 'react'
import { stringAvatar } from '../utils/eventUtils'
import { ErrorEventChip } from './ErrorEventChip'
import {
  DisplayedIcons,
  EventChipProps,
  getBestColor,
  getCardStyle,
  getEventDuration,
  getEventTimes,
  getOwnerAttendee,
  getTitleStyle,
  IconDisplayConfig,
  useCompactMode
} from './EventChipUtils'
import { userAttendee } from '@/features/User/models/attendee'

const PRIVATE_CLASSIFICATIONS = ['PRIVATE', 'CONFIDENTIAL']

export const EVENT_DURATION = {
  SHORT: 15,
  MEDIUM: 30,
  LONG: 60
} as const

export const EventChip: React.FC<EventChipProps> = ({
  arg,
  calendars,
  tempcalendars,
  errorHandler
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const showCompact = useCompactMode(cardRef)

  const event = arg.event
  const props = event._def.extendedProps
  const { calId, temp, attendee: attendees = [], class: classification } = props

  try {
    // Calendar validation
    const calendarsSource = temp ? tempcalendars : calendars
    const calendar = calendarsSource[calId as string]
    if (!calendar) return null

    // Event properties
    const isPrivate = PRIVATE_CLASSIFICATIONS.includes(classification as string)
    const ownerEmails = new Set(
      calendar.owner?.emails?.map(e => e.toLowerCase())
    )
    // const delegated = calendar.delegated;

    // Determine owner attendee
    const ownerAttendee = getOwnerAttendee(
      attendees as userAttendee[],
      ownerEmails
    )

    // Presentation trick: if owner is not an attendee (e.g. created from external app like Apple Calendar),
    // treat them as ACCEPTED to show the event filled rather than blank.
    const displayPartstat = ownerAttendee?.partstat || 'ACCEPTED'

    // Color and contrast logic
    const bestColor = getBestColor(
      (calendar.color as { light: string; dark: string }) ?? {
        light: '#fff',
        dark: '#000'
      }
    )

    // Icon display configuration
    const IconDisplayed: IconDisplayConfig = {
      declined: ownerAttendee?.partstat === 'DECLINED',
      tentative: ownerAttendee?.partstat === 'TENTATIVE',
      needAction: ownerAttendee?.partstat === 'NEEDS-ACTION',
      private: isPrivate
    }

    // View and time calculations
    const isMonthView = arg.view.type === CALENDAR_VIEWS.dayGridMonth
    const timeZone = arg.view.calendar?.getOption('timeZone') || 'UTC'
    const { startTime, endTime } = getEventTimes(event, timeZone)
    const eventLength = getEventDuration(event)

    const isMoreThan15 = eventLength > EVENT_DURATION.SHORT
    const isMoreThan30 = eventLength > EVENT_DURATION.MEDIUM
    const isMoreThan60 = eventLength > EVENT_DURATION.LONG

    // Style calculation
    const titleStyle = getTitleStyle(
      bestColor,
      displayPartstat,
      calendar,
      isPrivate
    )

    const cardStyle = getCardStyle(
      bestColor,
      eventLength,
      displayPartstat,
      calendar,
      isPrivate
    )

    // Organizer avatar
    const organizer = event._def.extendedProps.organizer as
      | { cn?: string; cal_address?: string }
      | undefined

    const OrganizerAvatar = organizer
      ? stringAvatar(organizer.cn ?? organizer.cal_address ?? '')
      : { color: undefined, children: null }

    return (
      <Card
        variant="outlined"
        style={{
          ...cardStyle,
          ...(!isMoreThan15 || isMonthView ? { height: 'auto' } : {}),
          ...(!isMoreThan15 && !isMonthView
            ? { transform: 'translateY(2px)' }
            : {})
        }}
        ref={cardRef}
        data-testid={`event-card-${event._def.extendedProps.uid}`}
      >
        <CardHeader
          sx={{
            py: '0px',
            px: '0px',
            '& .MuiCardHeader-content': {
              overflow: 'hidden'
            }
          }}
          title={
            showCompact ? (
              <Typography variant="body2" style={titleStyle}>
                {event.title}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
                >
                  {(!isMoreThan30 || isMonthView) &&
                    !event._def.extendedProps.allday && (
                      <Typography
                        variant="body2"
                        className="compactStartTime"
                        style={{
                          ...titleStyle,
                          textDecoration: 'none',
                          overflow: 'visible',
                          opacity: '70%',
                          letterSpacing: '0%',
                          fontSize: '10px',
                          marginRight: '4px'
                        }}
                      >
                        {startTime}
                      </Typography>
                    )}
                  {DisplayedIcons(IconDisplayed, titleStyle.color)}
                  <Typography variant="body2" noWrap style={titleStyle}>
                    {event.title}
                  </Typography>
                </Box>
              </Box>
            )
          }
          subheader={
            isMoreThan30 &&
            !isMonthView &&
            !event._def.extendedProps.allday && (
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
                {startTime} {!showCompact && ` - ${endTime}`}
              </Typography>
            )
          }
        />
        {isMoreThan60 &&
          !showCompact &&
          !isMonthView &&
          !event._def.extendedProps.allday && (
            <CardContent
              sx={{
                p: 0,
                '& .MuiCardContent-content': {
                  overflow: 'hidden'
                }
              }}
            >
              {event._def.extendedProps.location && (
                <Typography
                  style={{
                    marginRight: 2,
                    fontFamily: 'Roboto',
                    fontWeight: '500',
                    fontStyle: 'Medium',
                    fontSize: '10px',
                    lineHeight: '16px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                    color: titleStyle.color,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {event._def.extendedProps.location}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                {event._def.extendedProps.description && (
                  <Typography
                    sx={{
                      fontFamily: 'Roboto',
                      fontWeight: 500,
                      fontSize: '10px',
                      lineHeight: '16px',
                      letterSpacing: '0%',
                      opacity: 0.8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      maxWidth: '100%',
                      color: titleStyle.color
                    }}
                  >
                    {event._def.extendedProps.description}
                  </Typography>
                )}
              </Box>
            </CardContent>
          )}
        {(isMoreThan60 || eventLength === 60) &&
          !isMonthView &&
          !event._def.extendedProps.allday &&
          event._def.extendedProps.organizer &&
          !showCompact &&
          window.displayOrgAvatar && (
            <Avatar
              color={OrganizerAvatar.color}
              size="xs"
              sx={{
                bottom: 0,
                right: 0,
                margin: '8px',
                position: 'absolute',
                border: '2px solid white'
              }}
            >
              {OrganizerAvatar.children}
            </Avatar>
          )}
      </Card>
    )
  } catch (e) {
    return (
      <ErrorEventChip event={event} errorHandler={errorHandler} error={e} />
    )
  }
}
