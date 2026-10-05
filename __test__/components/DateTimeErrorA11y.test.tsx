import {
  DateTimeError,
  DateTimeErrorIdContext,
  useDateTimeErrorId
} from '@common/components/Event/components/DateTimeFields/DateTimeError'
import { render, screen } from '@testing-library/react'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

describe('DateTimeError accessibility', () => {
  it('announces an error and carries the id fields refer to', () => {
    render(
      <DateTimeError id="dt-error" message="dateTimeFields.endBeforeStart" />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('id', 'dt-error')
    expect(alert).toHaveTextContent('dateTimeFields.endBeforeStart')
  })

  it('announces a warning politely', () => {
    render(<DateTimeError id="dt-warning" message="some.warning" warning />)

    expect(screen.getByRole('status')).toHaveTextContent('some.warning')
  })

  it('gives the fields the id of the displayed error', () => {
    const Probe = (): JSX.Element => (
      <span>{useDateTimeErrorId() ?? 'none'}</span>
    )

    render(
      <DateTimeErrorIdContext.Provider value="dt-error">
        <Probe />
      </DateTimeErrorIdContext.Provider>
    )

    expect(screen.getByText('dt-error')).toBeInTheDocument()
  })
})
