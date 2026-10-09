import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BookedEventPreviewPage } from '@public/components/EventPreview/BookedEventPreview'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en-US'
  })
}))

jest.mock('react-router', () => ({
  useParams: () => ({ bookingConfirmationToken: 'token' })
}))

jest.mock('@common/utils/timezone', () => ({
  ...jest.requireActual('@common/utils/timezone'),
  browserDefaultTimeZone: 'Europe/Paris'
}))

jest.mock(
  '@public/features/EventPreview/hooks/useFetchBookedEventDetail',
  () => ({
    useFetchBookedEventDetail: () => ({
      event: {
        URL: '',
        calId: '',
        uid: 'uid',
        title: 'Consult',
        start: '2026-10-16T09:00:00Z',
        end: '2026-10-16T09:30:00Z',
        timezone: 'UTC',
        attendee: []
      },
      loading: false,
      error: false,
      errorDetail: undefined,
      refetch: jest.fn()
    })
  })
)

jest.mock('@public/features/booking/BookingDao', () => ({
  cancelBookedEvent: jest.fn()
}))

jest.mock('@common/components/Loading/Loading', () => ({
  Loading: () => null
}))

jest.mock('@common/components/EventPreview/EventPreviewTitleRow', () => ({
  EventPreviewTitleRow: ({ timezone }: { timezone: string }) => (
    <div data-testid="title-row-timezone">{timezone}</div>
  )
}))

jest.mock('@common/components/Timezone/TimezoneSelector', () => ({
  TimezoneSelector: ({ value, onChange }: any) => (
    <select
      data-testid="timezone-selector"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="Europe/Paris">Europe/Paris</option>
      <option value="Asia/Tokyo">Asia/Tokyo</option>
    </select>
  )
}))

jest.mock(
  '@/components/EventPreview/EventPreviewDetails',
  () => ({ EventPreviewDetails: () => null }),
  { virtual: true }
)

jest.mock(
  '@/components/EventPreview/EventStatus',
  () => ({ EventStatus: () => null }),
  { virtual: true }
)

jest.mock(
  '@/features/booking/components/BookingSuccessDialog',
  () => ({ SuccessFooter: () => null }),
  { virtual: true }
)

describe('BookedEventPreviewPage', () => {
  it('displays the UTC booked event in the browser time zone by default', () => {
    render(<BookedEventPreviewPage />)

    expect(screen.getByTestId('timezone-selector')).toHaveValue('Europe/Paris')
    expect(screen.getByTestId('title-row-timezone')).toHaveTextContent(
      'Europe/Paris'
    )
  })

  it('displays the booked event in the time zone picked by the visitor', () => {
    render(<BookedEventPreviewPage />)

    fireEvent.change(screen.getByTestId('timezone-selector'), {
      target: { value: 'Asia/Tokyo' }
    })

    expect(screen.getByTestId('title-row-timezone')).toHaveTextContent(
      'Asia/Tokyo'
    )
  })
})
