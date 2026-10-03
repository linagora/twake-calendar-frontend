import { useIntentService } from '@common/features/Intents/hooks/useIntentService'
import IntentEntry from '@private/features/Intents/IntentEntry'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { makeIntentService } from '../../utils/makeIntentService'

jest.mock('@common/features/Intents/hooks/useIntentService')
jest.mock('@common/components/Loading/Loading', () => ({
  Loading: () => <div data-testid="loading" />
}))
jest.mock('@private/features/Intents/IntentDayView', () => ({
  IntentDayView: () => <div data-testid="intent-day-view" />
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const mockUseIntentService = useIntentService as jest.Mock

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <IntentEntry />
    </MemoryRouter>
  )
}

describe('IntentEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts the service of the intent in the URL', () => {
    mockUseIntentService.mockReturnValue({ status: 'loading' })

    renderAt('/intents?intent=abc&session_code=xyz')

    expect(mockUseIntentService).toHaveBeenCalledWith('abc')
    expect(screen.queryByTestId('loading')).toBeInTheDocument()
    expect(screen.queryByTestId('intent-message')).toBe(null)
  })

  it('explains why the intent cannot be served', () => {
    mockUseIntentService.mockReturnValue({
      status: 'error',
      reason: 'forbidden'
    })

    renderAt('/intents?intent=abc')

    expect(screen.queryByTestId('intent-message')).toHaveTextContent(
      'intents.error.forbidden'
    )
  })

  it('reports an expired session without starting the service', () => {
    mockUseIntentService.mockReturnValue({
      status: 'error',
      reason: 'missingIntent'
    })

    renderAt('/intents?intent=abc&authError=login_required')

    expect(mockUseIntentService).toHaveBeenCalledWith(null)
    expect(screen.queryByTestId('intent-message')).toHaveTextContent(
      'intents.error.sessionExpired'
    )
  })

  it('shows the day view for OPEN calendar events', () => {
    mockUseIntentService.mockReturnValue({
      status: 'ready',
      service: makeIntentService(),
      action: 'OPEN',
      type: 'io.cozy.calendar.events',
      data: { date: '2026-10-03' }
    })

    renderAt('/intents?intent=abc')

    expect(screen.queryByTestId('intent-layout')).toBeInTheDocument()
    expect(screen.queryByTestId('intent-day-view')).toBeInTheDocument()
  })

  it('fails an intent it does not handle', () => {
    const service = makeIntentService()
    mockUseIntentService.mockReturnValue({
      status: 'ready',
      service,
      action: 'CREATE',
      type: 'io.cozy.files',
      data: {}
    })

    renderAt('/intents?intent=abc')

    expect(service.throw).toHaveBeenCalledWith(expect.any(Error))
    expect(screen.queryByTestId('intent-message')).toHaveTextContent(
      'intents.error.unsupported'
    )
  })
})
