import React, { useRef } from 'react'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { EventChange, LanguageSelectorInputProps } from './index.types'
import {
  MobileSelector,
  MobileSelectorHandle
} from '@common/components/MobileSelector'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import { Check as CheckIcon } from '@mui/icons-material'
import { useI18n } from 'twake-i18n'

export const MobileLanguageSelector: React.FC<LanguageSelectorInputProps> = ({
  currentLanguage,
  onChange
}) => {
  const { t } = useI18n()
  const theme = useTheme()
  const selectorRef = useRef<MobileSelectorHandle>(null)

  const currentLabel =
    AVAILABLE_LANGUAGES.find(({ code }) => code === currentLanguage)?.label ??
    currentLanguage

  const handleChange = (event: EventChange): void => {
    onChange(event)
    selectorRef.current?.onClose()
  }

  return (
    <MobileSelector
      ref={selectorRef}
      displayText={currentLabel}
      label={t('settings.language')}
    >
      <List sx={{ overflow: 'auto', flex: 1, pt: 0 }}>
        {AVAILABLE_LANGUAGES.map(({ code, label }) => (
          <ListItem key={code} value={code} lang={code} disablePadding>
            <ListItemButton
              selected={currentLanguage === code}
              aria-selected={currentLanguage === code}
              onClick={() =>
                handleChange({ target: { value: code } } as EventChange)
              }
              sx={{ py: 1 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>{label}</Typography>
                  </Box>
                }
              />
              {currentLanguage === code && (
                <CheckIcon
                  sx={{ color: theme.palette.primary.main, fontSize: '20px' }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </MobileSelector>
  )
}
