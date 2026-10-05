import Tooltip from '@common/components/Tooltip'
import { VisuallyHidden } from '@common/components/VisuallyHidden'
import { Box, FormControlLabel, Switch } from '@linagora/twake-mui'
import type { SxProps, Theme } from '@linagora/twake-mui'
import { useId } from 'react'
import { useI18n } from 'twake-i18n'
import { setHighContrastEnabled, useHighContrast } from './highContrastMode'

/**
 * R-29 / R-30: the high contrast mode within one step of every page (footer of
 * the side bars, of the public pages), described by a flyover on hover and on
 * keyboard focus, and to screen readers.
 */
export const HighContrastSwitch: React.FC<{ sx?: SxProps<Theme> }> = ({
  sx
}) => {
  const { t } = useI18n()
  const highContrast = useHighContrast()
  const descriptionId = useId()

  return (
    <Box sx={sx}>
      <Tooltip
        title={t('settings.accessibility.highContrastDescription')}
        placement="top"
        describeChild
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={highContrast}
              onChange={() => setHighContrastEnabled(!highContrast)}
              slotProps={{
                input: { 'aria-describedby': descriptionId }
              }}
            />
          }
          label={t('settings.accessibility.highContrast')}
          slotProps={{ typography: { variant: 'body2' } }}
          sx={{ marginLeft: 0 }}
        />
      </Tooltip>
      <VisuallyHidden id={descriptionId}>
        {t('settings.accessibility.highContrastDescription')}
      </VisuallyHidden>
    </Box>
  )
}
