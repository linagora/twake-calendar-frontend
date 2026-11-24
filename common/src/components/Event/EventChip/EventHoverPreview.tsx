import Tooltip from '@common/components/Tooltip'
import { Stack, Typography, useMediaQuery } from '@linagora/twake-mui'
import CircleIcon from '@mui/icons-material/Circle'
import React, { useEffect, useState } from 'react'

// Shorter than TOOLTIP_DELAY_MS: reading a narrow event is the point here
export const HOVER_PREVIEW_DELAY_MS = 500

interface EventHoverPreviewContentProps {
  title: string
  time: string
  calendarName?: string
  calendarColor?: string
  location?: string
  description?: string
}

export interface EventHoverPreviewProps extends EventHoverPreviewContentProps {
  disabled: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  children: React.ReactElement
}

export const EventHoverPreview: React.FC<EventHoverPreviewProps> = ({
  disabled,
  anchorRef,
  children,
  ...content
}) => {
  const canHover = useMediaQuery('(hover: hover)')
  const [open, setOpen] = useState(false)
  // A pressed event opens or moves: no preview until the pointer leaves it
  const [pressed, setPressed] = useState(false)

  // FullCalendar's event element takes the keyboard focus and the click
  useEffect(() => {
    const eventEl = anchorRef.current?.closest<HTMLElement>('.fc-event')
    if (!canHover || !eventEl) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const show = (): void => {
      if (!eventEl.matches(':focus-visible')) return
      setPressed(false)
      timer = setTimeout(() => setOpen(true), HOVER_PREVIEW_DELAY_MS)
    }
    const hide = (): void => {
      clearTimeout(timer)
      setOpen(false)
    }
    const press = (): void => {
      hide()
      setPressed(true)
    }
    const release = (): void => setPressed(false)
    eventEl.addEventListener('focus', show)
    eventEl.addEventListener('blur', hide)
    eventEl.addEventListener('mousedown', press)
    eventEl.addEventListener('mouseleave', release)
    return (): void => {
      clearTimeout(timer)
      eventEl.removeEventListener('focus', show)
      eventEl.removeEventListener('blur', hide)
      eventEl.removeEventListener('mousedown', press)
      eventEl.removeEventListener('mouseleave', release)
    }
  }, [anchorRef, canHover])

  if (!canHover) return children

  return (
    <Tooltip
      open={open && !pressed && !disabled}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      enterDelay={HOVER_PREVIEW_DELAY_MS}
      enterNextDelay={HOVER_PREVIEW_DELAY_MS}
      disableTouchListener
      disableInteractive
      title={<EventHoverPreviewContent {...content} />}
    >
      {children}
    </Tooltip>
  )
}

const EventHoverPreviewContent: React.FC<EventHoverPreviewContentProps> = ({
  title,
  time,
  calendarName,
  calendarColor,
  location,
  description
}) => (
  <Stack spacing={0.5} data-testid="event-hover-preview">
    <Typography variant="subtitle2" color="inherit">
      {title}
    </Typography>
    <Typography variant="caption" color="inherit">
      {time}
    </Typography>
    {calendarName && (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <CircleIcon fontSize="inherit" htmlColor={calendarColor} />
        <Typography variant="caption" color="inherit">
          {calendarName}
        </Typography>
      </Stack>
    )}
    {location && (
      <Typography variant="caption" color="inherit">
        {location}
      </Typography>
    )}
    {description && (
      <Typography
        variant="caption"
        color="inherit"
        // twake-mui has no line clamp for Typography
        sx={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 4,
          overflow: 'hidden',
          whiteSpace: 'pre-line'
        }}
      >
        {description}
      </Typography>
    )}
  </Stack>
)
