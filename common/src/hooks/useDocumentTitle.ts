import { useEffect } from 'react'

export const APP_TITLE = 'Twake Calendar'

/**
 * Describes the current view in the document title (RGAA 8.6), so that screen
 * reader users and users switching tabs know where they are. The application
 * name always comes last.
 */
export const useDocumentTitle = (...parts: (string | undefined)[]): void => {
  const title = [...parts.filter(Boolean), APP_TITLE].join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])
}
