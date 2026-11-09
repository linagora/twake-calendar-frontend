import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { EventPreviewPage } from '@public/features/EventPreview/EventPreviewPage'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en-US'
  })
}))

vi.mock('react-router', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()]
}))

vi.mock('@common/utils/timezone', async () => ({
  ...(await vi.importActual('@common/utils/timezone')),
  browserDefaultTimeZone: 'Asia/Ho_Chi_Minh'
}))

vi.mock('@public/features/EventPreview/hooks/useParseToken', () => ({
  useParseToken: () => ({ jwt: 'jwt', calId: 'calId', action: undefined })
}))

vi.mock('@public/features/EventPreview/hooks/useFetchEventDetail', () => ({
  useFetchEventDetail: () => ({
    event: {
      URL: '',
      calId: 'calId',
      uid: 'uid',
      title: 'Meeting',
      start: '2026-11-09T09:00:00Z',
      end: '2026-11-09T10:00:00Z',
      timezone: 'Europe/Paris',
      attendee: []
    },
    attendeeEmail: 'guest@example.com',
    links: undefined,
    loading: false,
    error: false,
    errorDetail: undefined
  })
}))

vi.mock('@public/features/EventPreview/hooks/useRsvpAction', () => ({
  useRsvpAction: () => ({
    toastOpen: false,
    setToastOpen: vi.fn(),
    handleRsvpChoice: vi.fn()
  })
}))

vi.mock('@common/components/Loading/Loading', () => ({
  Loading: () => null
}))

vi.mock('@common/components/EventPreview/EventPreviewTitleRow', () => ({
  EventPreviewTitleRow: ({ timezone }: { timezone: string }) => (
    <div data-testid="title-row-timezone">{timezone}</div>
  )
}))

vi.mock('@common/components/Timezone/TimezoneSelector', () => ({
  TimezoneSelector: ({ value, onChange }: any) => (
    <select
      data-testid="timezone-selector"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
      <option value="Asia/Tokyo">Asia/Tokyo</option>
    </select>
  )
}))

vi.mock('@public/components/EventPreview/EventPreviewDetails', () => ({
  EventPreviewDetails: () => null
}))

vi.mock('@public/components/EventPreview/EventStatus', () => ({
  EventStatus: () => null
}))

vi.mock(
  '@public/features/EventPreview/components/AttendanceValidation',
  () => ({
    AttendanceValidation: () => null
  })
)

describe('EventPreviewPage', () => {
  it('displays the event in the browser time zone rather than its own', () => {
    render(<EventPreviewPage />, { wrapper: TwakeMuiThemeProvider })

    expect(screen.getByTestId('timezone-selector')).toHaveValue(
      'Asia/Ho_Chi_Minh'
    )
    expect(screen.getByTestId('title-row-timezone')).toHaveTextContent(
      'Asia/Ho_Chi_Minh'
    )
  })

  it('displays the event in the time zone picked by the attendee', () => {
    render(<EventPreviewPage />, { wrapper: TwakeMuiThemeProvider })

    fireEvent.change(screen.getByTestId('timezone-selector'), {
      target: { value: 'Asia/Tokyo' }
    })

    expect(screen.getByTestId('title-row-timezone')).toHaveTextContent(
      'Asia/Tokyo'
    )
  })
})
