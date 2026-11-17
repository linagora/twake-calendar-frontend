import CalendarLayout from '@private/components/Calendar/CalendarLayout'
import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import itIT from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

const locales = { de, en, es, fr, it: itIT, ru, vi }

describe('time grid "timed" row header (screen-reader only)', () => {
  const state = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'testSid',
        openpaasId: 'user1'
      }
    },
    calendars: { list: {}, pending: false }
  }

  it('comes from the app translations, not the English FullCalendar default', async () => {
    renderWithProviders(<CalendarLayout />, state)

    await waitFor(() =>
      expect(
        screen.getAllByText('a11y.timedEventsRowHeader').length
      ).toBeGreaterThan(0)
    )
    expect(screen.queryByText('Timed')).not.toBeInTheDocument()
  })

  it.each(Object.entries(locales))('is translated in %s', (_, phrases) => {
    expect(phrases.a11y.timedEventsRowHeader).toBeTruthy()
  })
})
