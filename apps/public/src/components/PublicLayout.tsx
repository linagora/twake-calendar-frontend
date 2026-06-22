import logo from '@common/static/header-logo.svg'
import {
  alpha,
  Box,
  Button,
  Link,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { PublicLanguageSelector } from './PublicLanguageSelector'

interface PublicLayoutProps {
  children?: React.ReactNode
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { t } = useI18n()
  const theme = useTheme()

  const handleHelpClick = (): void => {
    window.open(window.SUPPORT_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.grey[100],
        position: 'relative',
        padding: { xs: 2, sm: 4 }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <PublicLanguageSelector />

        <Button
          onClick={handleHelpClick}
          sx={{
            textTransform: 'none',
            color: theme.palette.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[900], 0.04),
              color: theme.palette.text.secondary
            }
          }}
        >
          {t('menubar.help')}
          <HelpOutlineIcon sx={{ fontSize: 20 }} />
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 8,
          mb: 6
        }}
      >
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          pb: 4,
          textAlign: 'center'
        }}
      >
        <Link
          href={window.LANDING_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={logo}
            alt={t('publicLayout.logoAlt')}
            style={{ height: '32px', marginBottom: '8px' }}
          />
        </Link>
        <Typography variant="body2">{t('publicLayout.title')}</Typography>
        <Typography variant="body2">
          {t('publicLayout.useSubjectTo')}{' '}
          <Link
            href={window.PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {t('publicLayout.privacyPolicy')}
          </Link>{' '}
          {t('publicLayout.and')}{' '}
          <Link
            href={window.TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {t('publicLayout.termsOfService')}
          </Link>
          {t('publicLayout.dot')}
        </Typography>
      </Box>
    </Box>
  )
}

export default PublicLayout
