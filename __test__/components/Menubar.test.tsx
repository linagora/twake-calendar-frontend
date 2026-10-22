import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { Menubar } from '@common/components/Menubar/Menubar'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('Menubar', () => {
  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        family_name: 'Doe',
        name: 'John',
        sid: 'mockSid',
        openpaasId: '667037022b752d0026472254'
      }
    },
    settings: {
      language: 'en'
    }
  }

  afterEach(() => {
    document.body.classList.remove('fullscreen-view')
    delete window.ENABLE_REFRESH_BUTTON
  })

  it('has navigation controls element with correct class', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const navigationControls = container.querySelector('.navigation-controls')
    expect(navigationControls).toBeInTheDocument()
    expect(navigationControls).toHaveClass('navigation-controls')
  })

  it('has current date time element with correct class', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const dateTimeDisplay = container.querySelector('.current-date-time')
    expect(dateTimeDisplay).toBeInTheDocument()
    expect(dateTimeDisplay).toHaveClass('current-date-time')
  })

  it('has refresh button element with correct class when enabled', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')
    window.ENABLE_REFRESH_BUTTON = true
    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const refreshButton = container.querySelector('.refresh-button')
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).toHaveClass('refresh-button')
  })

  it('hide refresh button element when disabled', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')
    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const refreshButton = container.querySelector('.refresh-button')
    expect(refreshButton).toBeNull()
  })

  it('has view selector element with correct class', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const selectDisplay = container.querySelector('.select-display')
    expect(selectDisplay).toBeInTheDocument()
    expect(selectDisplay).toHaveClass('select-display')
  })

  it('navigates to settings page when clicking Settings', async () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')

    const preloadedStateWithSettings = {
      ...preloadedState,
      settings: {
        language: 'en',
        view: 'calendar'
      }
    }

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedStateWithSettings
    )

    fireEvent.click(screen.getByLabelText('menubar.settings'))

    await waitFor(() => {
      const state = store.getState()
      expect(state.settings.view).toBe('settings')
    })
  })

  it('shows all elements in normal mode (not expanded)', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    const navigationControls = container.querySelector('.navigation-controls')
    const dateTimeDisplay = container.querySelector('.current-date-time')
    const selectDisplay = container.querySelector('.select-display')

    expect(navigationControls).toBeVisible()
    expect(dateTimeDisplay).toBeVisible()
    expect(selectDisplay).toBeVisible()
  })

  it('verifies CSS classes are correctly applied to elements', () => {
    const mockCalendarRef = { current: null }
    const mockOnRefresh = jest.fn()
    const mockCurrentDate = new Date('2024-04-15')
    window.ENABLE_REFRESH_BUTTON = true

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        onToggleSidebar={() => {}}
        currentDate={mockCurrentDate}
        currentView={CALENDAR_VIEWS.dayGridMonth}
      />,
      preloadedState
    )

    expect(container.querySelector('.menubar')).toBeInTheDocument()
    expect(container.querySelector('.navigation-controls')).toBeInTheDocument()
    expect(container.querySelector('.current-date-time')).toBeInTheDocument()
    expect(container.querySelector('.refresh-button')).toBeInTheDocument()
    expect(container.querySelector('.select-display')).toBeInTheDocument()
  })
})
