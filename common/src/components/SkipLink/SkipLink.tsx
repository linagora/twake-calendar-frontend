import { useHighContrast } from '@common/features/Settings/Accessibility/highContrastMode'
import { useI18n } from 'twake-i18n'

export const MAIN_CONTENT_ID = 'main-content'

/**
 * "Skip to content": the first focusable element of the page, shown when it
 * receives the focus (RGAA 12.7). Part of the high contrast mode, since it
 * becomes visible. Focus is moved programmatically rather than through a
 * #hash, which the router would take for a navigation.
 */
export const SkipLink: React.FC = () => {
  const { t } = useI18n()
  const highContrast = useHighContrast()

  if (!highContrast) return null

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="skip-link"
      onClick={event => {
        event.preventDefault()
        document.getElementById(MAIN_CONTENT_ID)?.focus()
      }}
    >
      {t('a11y.skipToContent')}
    </a>
  )
}

export default SkipLink
