import { setupStore } from '@common/app/store'
import { useEmbeddedEventUid } from '@common/features/Embed/embeddedCalendar'
import { useSelectedCalendars } from '@common/utils/storage/useSelectedCalendars'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

const storeAt = (pathname: string): ReturnType<typeof setupStore> =>
  setupStore({
    router: {
      location: { pathname, search: '', hash: '', state: null, key: 'k' },
      action: 'POP'
    }
  } as Parameters<typeof setupStore>[0])

const renderAt = (pathname: string): string[] => {
  const store = storeAt(pathname)
  const { result } = renderHook(() => useSelectedCalendars(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  })
  return result.current
}

describe('useSelectedCalendars', () => {
  beforeEach(() => {
    localStorage.setItem('selectedCalendars', JSON.stringify(['user1/cal1']))
  })

  afterEach(() => {
    localStorage.removeItem('selectedCalendars')
  })

  it('shows only the team calendar of an embed route', () => {
    expect(renderAt('/embed/calendars/team1')).toEqual(['team1/team1'])
    expect(renderAt('/embed/calendars/team1/events/e1')).toEqual([
      'team1/team1'
    ])
  })

  it('shows the selection of the user anywhere else', () => {
    expect(renderAt('/calendar')).toEqual(['user1/cal1'])
    expect(renderAt('/embed/calendars/../x')).toEqual(['user1/cal1'])
    expect(renderAt('/embed/calendars/team1/other')).toEqual(['user1/cal1'])
  })
})

describe('useEmbeddedEventUid', () => {
  const uidAt = (pathname: string): string | null =>
    renderHook(() => useEmbeddedEventUid(), {
      wrapper: ({ children }) => (
        <Provider store={storeAt(pathname)}>{children}</Provider>
      )
    }).result.current

  it('reads the event of an embed route, decoded', () => {
    expect(uidAt('/embed/calendars/team1/events/uid%2F1%40acme')).toBe(
      'uid/1@acme'
    )
  })

  it('is null on the calendar alone, or out of an embed route', () => {
    expect(uidAt('/embed/calendars/team1')).toBeNull()
    expect(uidAt('/events/e1')).toBeNull()
    expect(uidAt('/embed/calendars/team1/events/%E0')).toBeNull()
  })
})
