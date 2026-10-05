import React, { useMemo } from 'react'
import { Box, Typography, Avatar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import {
  BookingExtraAttendeeItem,
  BookingSlotsResponse
} from '@common/features/booking/types/BookingTypes'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import { InfoRow } from '@common/components/Event/InfoRow'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import { BookingExtraAttendees } from './BookingExtraAttendees'
import { userAttendee } from '@common/features/User/models/attendee'
import Tooltip from '@common/components/Tooltip'

export const BookingOwnerAvatar: React.FC<{
  owner: BookingSlotsResponse['owner']
  size?: 's' | 'm' | 'l'
}> = ({ owner, size }) => {
  return (
    <Tooltip title={owner.displayName || owner.email}>
      <Box>
        <Avatar
          size={size}
          {...stringAvatar(owner.displayName || owner.email)}
          sx={{ mr: 1 }}
        />
      </Box>
    </Tooltip>
  )
}

export const BookingOwnerName: React.FC<{
  owner: BookingSlotsResponse['owner']
}> = ({ owner }) => {
  return (
    <Typography component="p" variant="subtitle1">
      {owner.displayName || owner.email}
    </Typography>
  )
}

export const BookingOwnerDisplay: React.FC<{
  owner: BookingSlotsResponse['owner']
  size?: 's' | 'm' | 'l'
  showName?: boolean
}> = ({ owner, size, showName = true }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <BookingOwnerAvatar owner={owner} size={size} />
      {showName && (
        <Typography variant="body2">
          {owner.displayName || owner.email}
        </Typography>
      )}
    </Box>
  )
}

export const BookingTitle: React.FC<{ bookingInfo: BookingSlotsResponse }> = ({
  bookingInfo
}) => {
  const { t } = useI18n()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', ml: 1 }}>
      {bookingInfo.name && (
        <Typography component="h1" variant="h6">
          {bookingInfo.name}
        </Typography>
      )}
      <TimerOutlinedIcon sx={{ color: 'text.secondary' }} />
      <Typography
        variant="caption"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'text.secondary'
        }}
      >
        {t('booking.durationMinutes', {
          count: bookingInfo.durationMinutes
        })}
      </Typography>
    </Box>
  )
}

const BookingDescription: React.FC<{ description?: string }> = ({
  description
}) => {
  if (!description) return null
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary', mt: '4px' }}>
      {description}
    </Typography>
  )
}

const BookingLocation: React.FC<{ location?: string }> = ({ location }) => {
  if (!location) return null
  return (
    <Box sx={{ mt: 1 }}>
      <InfoRow
        icon={
          <LocationOnOutlinedIcon sx={{ color: 'text.secondary', mr: 1 }} />
        }
        text={location}
      />
    </Box>
  )
}

const BookingResources: React.FC<{
  resources?:
    | {
        name: string
        photoUrl?: string | undefined
      }[]
    | string[]
    | undefined
}> = ({ resources }) => {
  if (!resources || resources.length === 0) return null
  const resourceNames = resources
    .map(resource => (typeof resource === 'string' ? resource : resource.name))
    .filter((name): name is string => Boolean(name))
    .join(', ')
  if (!resourceNames) return null
  if (!resourceNames) return null
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}
    >
      <LayersOutlinedIcon sx={{ color: 'text.secondary' }} />
      <Typography>{resourceNames}</Typography>
    </Box>
  )
}

export const BookingEventDetails: React.FC<{
  bookingInfo: BookingSlotsResponse
}> = ({ bookingInfo }) => {
  const extraAttendees = useMemo(() => {
    const attendees = bookingInfo.extraAttendees?.and
    if (!attendees || !Array.isArray(attendees)) return []
    return attendees.map(
      (attendee: BookingExtraAttendeeItem) =>
        new userAttendee({
          cn: attendee.displayName,
          cal_address: attendee.email
        })
    )
  }, [bookingInfo])

  return (
    <Box>
      <BookingDescription description={bookingInfo.description} />
      <BookingLocation location={bookingInfo.location} />
      <BookingResources resources={bookingInfo.resources} />

      {extraAttendees.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <BookingExtraAttendees extraAttendees={extraAttendees} />
        </Box>
      )}
    </Box>
  )
}
