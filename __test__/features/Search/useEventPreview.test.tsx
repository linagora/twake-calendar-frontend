import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import * as EventDao from '@common/features/Events/EventDao'
import { useEventPreview } from '@common/features/Search/useEventPreview'
import { SearchEventResult } from '@common/features/Search/types/SearchEventResult'
import { Calendar } from '@common/types/CalendarTypes'
import { act, renderHook } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

vi.mock('@common/features/Events/EventDao')

const result = {
  data: {
    uid: 'event1',
    userId: 'owner1',
    calendarId: 'cal1',
    summary: 'Owner meeting',
    start: '2025-07-02T10:00:00Z',
    end: '2025-07-02T11:00:00Z',
    allDay: false
  },
  _links: { self: { href: '/calendars/owner1/cal1/event1.ics' } }
} as unknown as SearchEventResult

const calendar = (overrides: Partial<Calendar>): Calendar =>
  ({
    id: 'owner1/cal1',
    link: '/calendars/owner1/cal1.json',
    name: 'cal',
    owner: { emails: [] },
    visibility: 'private',
    events: {},
    ...overrides
  }) as Calendar

async function openedURL(cal: Calendar): Promise<string> {
  ;(EventDao.fetchEvent as Mock).mockResolvedValue({})
  const store = setupStore({})
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  )
  const { result: hook } = renderHook(() => useEventPreview(result, cal), {
    wrapper
  })
  await act(async () => {
    await hook.current.handleOpen()
  })
  return (EventDao.fetchEvent as Mock).mock.calls[0][0].URL
}

describe('useEventPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens a result of a delegated calendar through the sharee's instance", async () => {
    expect(
      await openedURL(
        calendar({
          delegated: true,
          link: '/calendars/sharee1/instance1.json'
        })
      )
    ).toBe('/calendars/sharee1/instance1/event1.ics')
  })

  it('opens a result of an own calendar where search found it', async () => {
    expect(await openedURL(calendar({}))).toBe(
      '/calendars/owner1/cal1/event1.ics'
    )
  })
})
