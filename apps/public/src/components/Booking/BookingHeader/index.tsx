import { BookingSlotsResponse } from '@common/features/booking/types/BookingTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { BookingHeaderDesktop } from './BookingHeaderDesktop'
import { BookingHeaderMobile } from './BookingHeaderMobile'

export const BookingHeader: React.FC<{ bookingInfo: BookingSlotsResponse }> = ({
  bookingInfo
}) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (isMobile) {
    return <BookingHeaderMobile bookingInfo={bookingInfo} />
  }

  return <BookingHeaderDesktop bookingInfo={bookingInfo} />
}
