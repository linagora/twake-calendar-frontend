import { Box, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { DesktopSelectLanguage } from './DesktopLanguageSelector'
import { MobileLanguageSelector } from './MobileLanguageSelector'
import { useLanguageChange } from '@common/features/Settings/hooks/useLanguageChange'
import type { LanguageSelectorProps } from './index.types'

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageError
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const { currentLanguage, handleLanguageChange } = useLanguageChange({
    onLanguageError
  })

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('settings.language')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t('settings.languageDescription')}
      </Typography>
      {isMobile ? (
        <MobileLanguageSelector
          currentLanguage={currentLanguage}
          onChange={handleLanguageChange}
        />
      ) : (
        <DesktopSelectLanguage
          currentLanguage={currentLanguage}
          onChange={handleLanguageChange}
        />
      )}
    </Box>
  )
}
