import calendarImage from '@/static/images/calendar.svg'
import { Box, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export function ScreenTooSmall() {
  const { t } = useI18n()
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2
      }}
    >
      <img src={calendarImage} style={{ width: 80, height: 80 }} alt="logo" />

      <Typography variant="h6">{t('mobile.comingSoon.title')}</Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ maxWidth: '264px' }}
      >
        {t('mobile.comingSoon.subtitle')}
      </Typography>
    </Box>
  )
}
