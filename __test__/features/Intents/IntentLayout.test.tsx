import { IntentLayout } from '@private/features/Intents/IntentLayout'
import { render, screen } from '@testing-library/react'
import { makeIntentService } from '../../utils/makeIntentService'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const crash = new Error('view crashed')

const CrashingView = (): JSX.Element => {
  throw crash
}

describe('IntentLayout', () => {
  it('renders the view inside the intent frame', () => {
    render(
      <IntentLayout service={makeIntentService()}>
        <div data-testid="intent-view" />
      </IntentLayout>
    )

    expect(screen.queryByTestId('intent-layout')).toContainElement(
      screen.queryByTestId('intent-view')
    )
  })

  it('fails the intent when the view crashes', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const service = makeIntentService()

    try {
      render(
        <IntentLayout service={service}>
          <CrashingView />
        </IntentLayout>
      )
    } finally {
      consoleError.mockRestore()
    }

    expect(screen.queryByTestId('intent-message')).toHaveTextContent(
      'intents.error.crashed'
    )
    expect(service.throw).toHaveBeenCalledTimes(1)
    expect(service.throw).toHaveBeenCalledWith(crash)
  })
})
