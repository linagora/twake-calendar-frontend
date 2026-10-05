import { AccessibilitySettings } from '@common/features/Settings/Accessibility/AccessibilitySettings'
import { HighContrastSwitch } from '@common/features/Settings/Accessibility/HighContrastSwitch'
import {
  HIGH_CONTRAST_STORAGE_KEY,
  isHighContrastEnabled,
  setHighContrastEnabled,
  useHighContrastDocumentAttribute
} from '@common/features/Settings/Accessibility/highContrastMode'
import { act, fireEvent, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('High contrast mode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-high-contrast')
  })

  it('is off by default', () => {
    expect(isHighContrastEnabled()).toBe(false)
  })

  it('is stored on the device', () => {
    setHighContrastEnabled(true)
    expect(localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY)).toBe('true')

    setHighContrastEnabled(false)
    expect(localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY)).toBeNull()
  })

  it('mirrors the mode on the html element', () => {
    renderHook(() => useHighContrastDocumentAttribute())
    expect(document.documentElement).not.toHaveAttribute('data-high-contrast')

    act(() => setHighContrastEnabled(true))
    expect(document.documentElement).toHaveAttribute(
      'data-high-contrast',
      'true'
    )

    act(() => setHighContrastEnabled(false))
    expect(document.documentElement).not.toHaveAttribute('data-high-contrast')
  })

  it('is switched from the accessibility settings', () => {
    renderWithProviders(<AccessibilitySettings />)
    const toggle = screen.getByRole('switch', {
      name: 'settings.accessibility.highContrast'
    })
    expect(toggle).not.toBeChecked()

    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
    expect(isHighContrastEnabled()).toBe(true)
  })

  it('documents the keyboard shortcuts', () => {
    renderWithProviders(<AccessibilitySettings />)

    const table = screen.getByRole('table', {
      name: 'settings.accessibility.keyboard.title'
    })
    // a header row plus one row per shortcut
    expect(table.querySelectorAll('tr')).toHaveLength(10)
  })

  it('can be switched from the side bars, with its description', () => {
    renderWithProviders(<HighContrastSwitch />)
    const toggle = screen.getByRole('switch', {
      name: 'settings.accessibility.highContrast'
    })
    expect(toggle).toHaveAccessibleDescription(
      'settings.accessibility.highContrastDescription'
    )

    fireEvent.click(toggle)

    expect(isHighContrastEnabled()).toBe(true)
  })
})
