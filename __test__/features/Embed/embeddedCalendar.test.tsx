import { setupStore } from '@common/app/store'
import { useSelectedCalendars } from '@common/utils/storage/useSelectedCalendars'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

const renderAt = (pathname: string): string[] => {
  const store = setupStore({
    router: {
      location: { pathname, search: '', hash: '', state: null, key: 'k' },
      action: 'POP'
    }
  } as Parameters<typeof setupStore>[0])
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
  })

  it('shows the selection of the user anywhere else', () => {
    expect(renderAt('/calendar')).toEqual(['user1/cal1'])
    expect(renderAt('/embed/calendars/../x')).toEqual(['user1/cal1'])
  })
})
