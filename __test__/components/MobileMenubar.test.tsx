import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { MobileMenubar } from '@common/components/Menubar/MobileMenuBar'
import '@testing-library/jest-dom'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('MobileMenubar', () => {
  const renderMobileMenubar = (
    dateLabel: string,
    shortDateLabel?: string
  ): HTMLElement => {
    const { container } = renderWithProviders(
      <MobileMenubar
        calendarRef={{ current: null }}
        currentDate={new Date('2026-09-28')}
        currentView={CALENDAR_VIEWS.timeGridWeek}
        dateLabel={dateLabel}
        shortDateLabel={shortDateLabel}
        handleNavigation={vi.fn()}
        onOpenSidebar={vi.fn()}
      />,
      { settings: { view: 'calendar' } }
    )
    return container
  }

  it('keeps the search button outside of the shrinkable title group', () => {
    const container = renderMobileMenubar('September – October 2026')

    const leftMenu = container.querySelector('.left-menu')
    const rightMenu = container.querySelector('.right-menu')
    const search = screen.getByRole('button', { name: 'common.search' })

    expect(leftMenu).not.toContainElement(search)
    expect(rightMenu).toContainElement(search)
    expect(leftMenu?.querySelector('.date-title')).toContainElement(
      screen.getByText('September – October 2026')
    )
  })

  const mockViewportWidth = (width: number): void => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: /max-width: 359/.test(query) && width < 360,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  }

  describe('period title width (#1719)', () => {
    const originalMatchMedia = window.matchMedia
    afterEach(() => {
      window.matchMedia = originalMatchMedia
    })

    it('shows the short month names below 360px', () => {
      mockViewportWidth(320)
      renderMobileMenubar('October 2026', 'Oct 2026')

      expect(screen.getByText('Oct 2026')).toBeInTheDocument()
      expect(screen.queryByText('October 2026')).not.toBeInTheDocument()
    })

    it('keeps the full month names from 360px', () => {
      mockViewportWidth(360)
      renderMobileMenubar('October 2026', 'Oct 2026')

      expect(screen.getByText('October 2026')).toBeInTheDocument()
    })

    it('falls back to the short title when the full one overflows (#1763)', () => {
      mockViewportWidth(390)
      // two lines of room, and a full title that needs three
      const scrollHeight = vi
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockReturnValue(60)
      const clientHeight = vi
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockReturnValue(40)
      // a browser reports the size of an observed element right away
      const originalResizeObserver = window.ResizeObserver
      window.ResizeObserver = class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe(): void {
          act(() => this.callback([], this as unknown as ResizeObserver))
        }
        unobserve(): void {}
        disconnect(): void {}
      }
      try {
        renderMobileMenubar('October – November 2026', 'Oct–Nov\n2026')

        expect(screen.getByText(/Oct–Nov/)).toBeInTheDocument()
        expect(
          screen.queryByText('October – November 2026')
        ).not.toBeInTheDocument()
      } finally {
        scrollHeight.mockRestore()
        clientHeight.mockRestore()
        window.ResizeObserver = originalResizeObserver
      }
    })
  })

  it('clamps a long period title instead of letting it grow', () => {
    renderMobileMenubar('September – October 2026')

    expect(screen.getByText('September – October 2026')).toHaveStyle({
      minWidth: '0',
      overflow: 'hidden'
    })
  })

  it('vertically centres the period title with its date-picker arrow', () => {
    const container = renderMobileMenubar('January 2026')

    expect(container.querySelector('.current-date-time')).toHaveStyle({
      alignItems: 'center'
    })
  })
})
