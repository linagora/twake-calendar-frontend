import { renderHook } from '@testing-library/react'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('falls back to the application name', () => {
    renderHook(() => useDocumentTitle())

    expect(document.title).toBe('Twake Calendar')
  })

  it('puts the view first and the application name last', () => {
    renderHook(() => useDocumentTitle('Oct 2026', 'Month'))

    expect(document.title).toBe('Oct 2026 – Month – Twake Calendar')
  })

  it('skips missing parts', () => {
    renderHook(() => useDocumentTitle(undefined, 'Settings'))

    expect(document.title).toBe('Settings – Twake Calendar')
  })

  it('follows the view when it changes', () => {
    const { rerender } = renderHook(
      ({ view }: { view: string }) => useDocumentTitle(view),
      { initialProps: { view: 'Settings' } }
    )

    rerender({ view: 'Search results' })

    expect(document.title).toBe('Search results – Twake Calendar')
  })
})
