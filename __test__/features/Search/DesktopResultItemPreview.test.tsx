import type { JSX } from 'react'
import DesktopResultItem from '@common/features/Search/DesktopResultItem'
import { SearchEventResult } from '@common/features/Search/types/SearchEventResult'
import { addEvent } from '@common/features/Calendars/CalendarSlice'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/Events/EventDao', async importOriginal => ({
  ...(await importOriginal<object>()),
  fetchEvent: vi.fn(() => new Promise(() => {}))
}))
vi.mock('@common/components/EventPreview', () => ({
  default: ({
    eventId,
    open
  }: {
    eventId: string
    open: boolean
  }): JSX.Element | null =>
    open ? <div data-testid="preview">{eventId}</div> : null
}))

const occurrenceKey = 'series/2026-11-24T10:00:00Z'

const preloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'mockSid',
      openpaasId: 'user1'
    },
    tokens: { accessToken: 'token' }
  },
  calendars: {
    list: {
      'user1/cal1': {
        name: 'Calendar personal',
        id: 'user1/cal1',
        color: { light: '#FF0000', dark: '#000' },
        owner: { emails: ['alice@example.com'] },
        events: {
          [occurrenceKey]: {
            uid: occurrenceKey,
            calId: 'user1/cal1',
            title: 'Plainseries',
            start: '2026-11-24T10:00:00Z',
            end: '2026-11-24T11:00:00Z'
          }
        }
      }
    },
    pending: false
  }
}

const seriesResult = {
  data: {
    uid: 'series',
    userId: 'user1',
    calendarId: 'cal1',
    summary: 'Plainseries',
    start: '2026-11-24T10:00:00Z',
    end: '2026-11-24T11:00:00Z',
    allDay: false,
    isRecurrentMaster: true
  },
  _links: { self: { href: '/calendars/user1/cal1/series.ics' } }
} as unknown as SearchEventResult

it('opens the preview of a series whose occurrences are loaded (#2204)', () => {
  renderWithProviders(
    <DesktopResultItem
      eventData={seriesResult}
      hasDetails={false}
      hasVideo={false}
    />,
    preloadedState
  )

  fireEvent.click(screen.getByRole('button'))

  expect(screen.getByTestId('preview')).toHaveTextContent(occurrenceKey)
})

it('keeps the preview on its occurrence when an earlier one loads later', () => {
  const laterResult = {
    ...seriesResult,
    data: { ...seriesResult.data, start: '2026-12-01T10:00:00Z' }
  } as SearchEventResult
  const { store } = renderWithProviders(
    <DesktopResultItem
      eventData={laterResult}
      hasDetails={false}
      hasVideo={false}
    />,
    preloadedState
  )
  fireEvent.click(screen.getByRole('button'))

  act(() => {
    store.dispatch(
      addEvent({
        calendarUid: 'user1/cal1',
        event: {
          uid: 'series/2026-11-17T10:00:00Z',
          calId: 'user1/cal1',
          title: 'Plainseries',
          start: '2026-11-17T10:00:00Z',
          end: '2026-11-17T11:00:00Z'
        } as never
      })
    )
  })

  expect(screen.getByTestId('preview')).toHaveTextContent(occurrenceKey)
})
