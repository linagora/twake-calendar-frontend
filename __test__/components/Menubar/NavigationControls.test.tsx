import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { NavigationControls } from '@common/components/Menubar/components/NavigationControls'
import { SmallNavigationControls } from '@common/components/Menubar/components/SmallNavigationControls'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

const steps = [
  [CALENDAR_VIEWS.timeGridDay, 'Day'],
  [CALENDAR_VIEWS.timeGridWeek, 'Week'],
  [CALENDAR_VIEWS.listWeek, 'Week'],
  [CALENDAR_VIEWS.dayGridMonth, 'Month']
]

describe.each([
  ['NavigationControls', NavigationControls],
  ['SmallNavigationControls', SmallNavigationControls]
])('%s', (_name, Controls) => {
  it.each(steps)('names the step of the %s view', (view, step) => {
    renderWithProviders(<Controls currentView={view} onNavigate={jest.fn()} />)

    expect(screen.getByLabelText(`menubar.prev${step}`)).toBeInTheDocument()
    expect(screen.getByLabelText(`menubar.next${step}`)).toBeInTheDocument()
  })

  it('falls back to previous and next for an unknown view', () => {
    renderWithProviders(<Controls currentView="other" onNavigate={jest.fn()} />)

    expect(screen.getByLabelText('menubar.prev')).toBeInTheDocument()
    expect(screen.getByLabelText('menubar.next')).toBeInTheDocument()
  })
})
