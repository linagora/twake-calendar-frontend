import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography
} from '@linagora/twake-mui'
import { useId } from 'react'
import { useI18n } from 'twake-i18n'
import { setHighContrastEnabled, useHighContrast } from './highContrastMode'
import { KeyboardShortcuts } from './KeyboardShortcuts'

export const AccessibilitySettings: React.FC = () => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  const highContrast = useHighContrast()
  const descriptionId = useId()

  return (
    <Box className="settings-tab-content">
      <Box sx={{ mb: 4 }}>
        <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
          {t('settings.accessibility.display')}
        </Typography>
        <FormControl size="small">
          <FormControlLabel
            control={
              <Switch
                checked={highContrast}
                onChange={() => setHighContrastEnabled(!highContrast)}
                slotProps={{
                  input: { 'aria-describedby': descriptionId }
                }}
              />
            }
            label={t('settings.accessibility.highContrast')}
            labelPlacement="start"
            sx={{
              minWidth: isMobile ? '100%' : 400,
              justifyContent: 'space-between',
              marginLeft: 0
            }}
          />
        </FormControl>
        <Typography
          id={descriptionId}
          variant="body2"
          sx={{ mt: 1, maxWidth: 560 }}
        >
          {t('settings.accessibility.highContrastDescription')}
        </Typography>
      </Box>
      <KeyboardShortcuts />
    </Box>
  )
}
