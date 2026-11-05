import type { JSX } from 'react'
import { Box } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export const MAIN_CONTENT_ID = 'main-content'

/**
 * The first stop of the Tab order, hidden until focused: lets keyboard users
 * jump over the menubar and the sidebar to the content of the page.
 */
export function SkipLink(): JSX.Element {
  const { t } = useI18n()

  return (
    <Box
      component="a"
      href={`#${MAIN_CONTENT_ID}`}
      // The hash drives the routing of the app: move the focus, not the URL
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        document.getElementById(MAIN_CONTENT_ID)?.focus()
      }}
      sx={{
        position: 'absolute',
        left: '-9999px',
        top: 8,
        zIndex: 2000,
        '&:focus': {
          left: 8,
          padding: '8px 12px',
          background: '#FFFFFF',
          color: '#000000',
          outline: '3px solid #000000'
        }
      }}
    >
      {t('a11y.skipToContent')}
    </Box>
  )
}
