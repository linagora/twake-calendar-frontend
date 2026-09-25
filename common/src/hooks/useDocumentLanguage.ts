import { useLayoutEffect } from 'react'

/**
 * Mirrors the UI language on `<html lang>` so that assistive technologies
 * (screen readers, spell checkers, hyphenation) use the right language.
 */
export const useDocumentLanguage = (lang: string): void => {
  useLayoutEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
}
