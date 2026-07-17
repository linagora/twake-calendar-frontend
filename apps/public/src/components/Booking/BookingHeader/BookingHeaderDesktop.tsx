import { BookingSlotsResponse } from '@common/features/booking/types/BookingTypes'
import { Box } from '@linagora/twake-mui'
import React from 'react'
import { BookingMetaInfo } from './BookingMetaInfo'
import { BookingEventDetails, BookingOwnerDisplay } from './BookingOwnerInfo'

export const BookingHeaderDesktop: React.FC<{
  bookingInfo: BookingSlotsResponse
  selectedTimezone: string
  onTimezoneChange: (tz: string) => void
  referenceDate: Date
}> = ({ bookingInfo, selectedTimezone, onTimezoneChange, referenceDate }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        p: '24px'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: 'column'
        }}
      >
        <BookingOwnerDisplay owner={bookingInfo.owner} />
        <Box sx={{ ml: bookingInfo.title ? 6.5 : 5 }}>
          <BookingEventDetails bookingInfo={bookingInfo} />
        </Box>
      </Box>
      <BookingMetaInfo
        selectedTimezone={selectedTimezone}
        onTimezoneChange={onTimezoneChange}
        referenceDate={referenceDate}
      />
    </Box>
  )
}
