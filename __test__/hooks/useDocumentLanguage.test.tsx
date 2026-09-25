import { renderHook } from '@testing-library/react'
import { useDocumentLanguage } from '@common/hooks/useDocumentLanguage'

describe('useDocumentLanguage', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en'
  })

  it('sets the html lang attribute to the UI language', () => {
    renderHook(() => useDocumentLanguage('fr'))

    expect(document.documentElement.getAttribute('lang')).toBe('fr')
  })

  it('updates the html lang attribute when the UI language changes', () => {
    const { rerender } = renderHook(
      ({ lang }: { lang: string }) => useDocumentLanguage(lang),
      { initialProps: { lang: 'fr' } }
    )

    rerender({ lang: 'vi' })

    expect(document.documentElement.getAttribute('lang')).toBe('vi')
  })
})
