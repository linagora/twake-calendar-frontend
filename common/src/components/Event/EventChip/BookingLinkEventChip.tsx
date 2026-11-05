import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { Box, Card, CardHeader, Typography } from '@linagora/twake-mui'
import EventIcon from '@mui/icons-material/Event'
import WebAssetOffOutlinedIcon from '@mui/icons-material/WebAssetOffOutlined'
import { useRef } from 'react'
import {
  EventChipProps,
  getBestColor,
  getCardStyle,
  getEventDuration,
  getTitleStyle,
  useCompactMode
} from './EventChipUtils'
import { defaultColors } from '@common/utils/defaultColors'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { useTheme } from '@mui/material'

export interface BookingLinkChipData {
  color?: string
  name?: string
  durationMinutes: number
  active?: boolean
}

interface BaseBookingLinkChipProps {
  data: BookingLinkChipData
  isMonthView?: boolean
  width?: string
  onClick?: () => void
  style?: React.CSSProperties
}

/**
 * Base booking link chip component - can be used standalone or within FullCalendar
 */
export const BaseBookingLinkChip: React.FC<BaseBookingLinkChipProps> = ({
  data,
  isMonthView = false,
  width = '20px',
  onClick,
  style
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const showCompact = useCompactMode(cardRef)
  const theme = useTheme()
  const chipColor = data.color

  // Create colors object for getBestColor
  const colors = chipColor
    ? {
        light: chipColor,
        dark: getAccessiblePair(chipColor, theme)
      }
    : defaultColors[0]

  // Color and contrast logic
  const bestColor = getBestColor(colors)

  // Style calculation - booking links are always treated as BOOKING
  const cardStyle = getCardStyle(bestColor, data.durationMinutes, 'BOOKING')

  const titleStyle = getTitleStyle(bestColor)

  const statusIcon =
    data.active === false ? (
      <WebAssetOffOutlinedIcon
        sx={{ fontSize: '12px' }}
        style={{ color: titleStyle.color }}
      />
    ) : (
      <EventIcon
        sx={{ fontSize: '12px' }}
        style={{ color: titleStyle.color }}
      />
    )

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{ alignItems: 'center' }}
      // The card colors go through style, not sx: they come from the server
      // and must not be able to add style rules.
      style={{
        ...cardStyle,
        ...(!isMonthView ? { width } : {}),
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      ref={cardRef}
      data-testid={`event-card-${data.name || 'booking'}`}
    >
      <CardHeader
        sx={{
          py: '0px',
          px: '0px',
          '.MuiCardHeader-title': { lineHeight: 1 }
        }}
        title={
          showCompact ? (
            statusIcon
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
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  gap: 1
                }}
              >
                {statusIcon}
                {isMonthView && (
                  <Typography variant="body2" noWrap style={titleStyle}>
                    {data.name}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        }
      />
    </Card>
  )
}

export const BookingLinkEventChip: React.FC<EventChipProps> = ({ arg }) => {
  const event = arg.event
  const props = event._def.extendedProps
  const { colors, active } = props
  const isMonthView = arg.view.type === CALENDAR_VIEWS.dayGridMonth
  const eventLength = getEventDuration(event)

  // Extract color from FullCalendar event
  const color =
    (colors as { light: string; dark: string } | undefined)?.dark ||
    (colors as { light: string; dark: string } | undefined)?.light ||
    event.color ||
    defaultColors[0].light
  return (
    <BaseBookingLinkChip
      data={{
        color,
        name: event.title,
        durationMinutes: eventLength,
        active: active as boolean | undefined
      }}
      isMonthView={isMonthView}
    />
  )
}
