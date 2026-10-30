import type { Mock } from 'vitest'
import CalendarSelection from '../../apps/private/src/components/Calendar/CalendarSelection'
import '@testing-library/jest-dom'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: (): { isTooSmall: boolean; isTablet: boolean } => ({
    isTooSmall: true,
    isTablet: false
  })
}))

vi.mock(
  '../../apps/private/src/features/booking/CreateAppointmentModal',
  () => ({
    CreateAppointmentModal: (): null => null
  })
)

vi.mock('@common/features/booking/BookingDao', () => ({
  listBookingLinks: vi.fn().mockResolvedValue([])
}))

describe('CalendarSelection on a phone-sized screen', () => {
  const renderSelection = (setSelectedCalendars = vi.fn()): Mock => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['user1/cal1']}
        setSelectedCalendars={setSelectedCalendars}
      />,
      {
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
              color: '#FF0000',
              owner: { emails: ['alice@example.com'], lastname: 'alice' }
            }
          },
          pending: false
        }
      }
    )
    return setSelectedCalendars
  }

  const longPress = (row: HTMLElement): void => {
    const touch = { pageX: 0, pageY: 0, clientX: 0, clientY: 0 }
    fireEvent.touchStart(row, { touches: [touch] })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.touchEnd(row, { changedTouches: [touch] })
  }

  const dismissActionsSheet = async (): Promise<void> => {
    fireEvent.keyDown(
      await screen.findByRole('button', { name: 'actions.modify' }),
      { key: 'Escape' }
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'actions.modify' })
      ).not.toBeInTheDocument()
    )
  }

  it('opens the calendar actions sheet without a touch long press', async () => {
    renderSelection()

    const row = screen
      .getByRole('checkbox', { name: 'Calendar personal' })
      .closest('li') as HTMLElement
    fireEvent.click(
      within(row).getByRole('button', { name: 'common.moreOptions' })
    )

    expect(
      await screen.findByRole('button', { name: 'actions.modify' })
    ).toBeInTheDocument()
  })

  it('moves the focus into the calendar actions sheet', async () => {
    renderSelection()

    fireEvent.click(screen.getByRole('button', { name: 'common.moreOptions' }))

    const modify = await screen.findByRole('button', { name: 'actions.modify' })
    await waitFor(() =>
      expect(
        modify.closest('.MuiDrawer-paper')?.contains(document.activeElement)
      ).toBe(true)
    )
  })

  it('does not toggle the calendar with the click ending a long press', () => {
    vi.useFakeTimers()
    try {
      const setSelectedCalendars = renderSelection()
      const checkbox = screen.getByRole('checkbox', {
        name: 'Calendar personal'
      })

      longPress(checkbox.closest('li') as HTMLElement)
      fireEvent.click(checkbox)

      expect(setSelectedCalendars).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the actions sheet with the button after a long press', async () => {
    vi.useFakeTimers()
    try {
      renderSelection()
      const row = screen
        .getByRole('checkbox', { name: 'Calendar personal' })
        .closest('li') as HTMLElement

      longPress(row)
      fireEvent.click(row)
      await dismissActionsSheet()

      fireEvent.click(
        within(row).getByRole('button', { name: 'common.moreOptions' })
      )

      expect(
        await screen.findByRole('button', { name: 'actions.modify' })
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the actions sheet with the button when a long press delivered no click', async () => {
    vi.useFakeTimers()
    try {
      renderSelection()
      const row = screen
        .getByRole('checkbox', { name: 'Calendar personal' })
        .closest('li') as HTMLElement

      longPress(row)
      await dismissActionsSheet()

      fireEvent.click(
        within(row).getByRole('button', { name: 'common.moreOptions' })
      )

      expect(
        await screen.findByRole('button', { name: 'actions.modify' })
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
