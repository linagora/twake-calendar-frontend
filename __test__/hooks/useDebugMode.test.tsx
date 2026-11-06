import type { JSX } from 'react'
import { act, render, screen } from '@testing-library/react'
import { useDebugMode } from '@common/hooks/useDebugMode'
import { toggleDebugMode } from '@common/utils/debugMode'

function DebugModeProbe(): JSX.Element {
  return <span>{useDebugMode() ? 'on' : 'off'}</span>
}

describe('useDebugMode', () => {
  beforeEach(() => {
    window.DEBUG = false
  })

  it('reads the flag shipped by .env.js', () => {
    window.DEBUG = true
    render(<DebugModeProbe />)

    expect(screen.getByText('on')).toBeInTheDocument()
  })

  it('re-renders subscribers when the flag is toggled', () => {
    render(<DebugModeProbe />)
    expect(screen.getByText('off')).toBeInTheDocument()

    act(() => {
      toggleDebugMode()
    })

    expect(screen.getByText('on')).toBeInTheDocument()
  })

  it('stops notifying unmounted subscribers', () => {
    const { unmount } = render(<DebugModeProbe />)

    unmount()

    expect(() => toggleDebugMode()).not.toThrow()
    expect(window.DEBUG).toBe(true)
  })
})
