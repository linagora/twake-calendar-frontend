import { fireEvent, render, RenderResult, screen } from '@testing-library/react'
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

const browser = vi.hoisted(() => ({ timeZone: 'Asia/Ho_Chi_Minh' }))

vi.mock('@common/utils/timezone', async () => ({
  ...(await vi.importActual('@common/utils/timezone')),
  get browserDefaultTimeZone() {
    return browser.timeZone
  }
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

const renderPage = (): RenderResult =>
  render(<EventPreviewPage />, { wrapper: TwakeMuiThemeProvider })

const pickTimeZone = async (name: RegExp): Promise<void> => {
  fireEvent.click(screen.getByRole('button'))
  fireEvent.mouseDown(await screen.findByRole('combobox'))
  fireEvent.click(await screen.findByRole('option', { name }))
}

describe('EventPreviewPage', () => {
  beforeEach(() => {
    browser.timeZone = 'Asia/Ho_Chi_Minh'
  })

  it('displays the event in the browser time zone rather than its own', () => {
    renderPage()

    // 09:00Z is 16:00 in Ho Chi Minh City (UTC+7), 10:00 in Paris
    expect(screen.getByRole('button')).toHaveTextContent('UTC+7')
    expect(screen.getByText(/16:00/)).toHaveTextContent('UTC+7')
  })

  it('displays the event in the time zone picked by the attendee', async () => {
    renderPage()

    await pickTimeZone(/tokyo/i)

    // 09:00Z is 18:00 in Tokyo (UTC+9)
    expect(screen.getByText(/18:00/)).toHaveTextContent('UTC+9')
    expect(screen.queryByText(/16:00/)).not.toBeInTheDocument()
  })

  it('selects the browser zone even when missing from the bundled ones', async () => {
    browser.timeZone = 'Europe/Kyiv'
    renderPage()

    // 09:00Z is 11:00 in Kyiv (UTC+2 in November)
    expect(screen.getByText(/11:00/)).toHaveTextContent('UTC+2')
    fireEvent.click(screen.getByRole('button'))
    fireEvent.mouseDown(await screen.findByRole('combobox'))
    expect(
      await screen.findByRole('option', { selected: true })
    ).toHaveTextContent('Europe/Kyiv')
  })
})
