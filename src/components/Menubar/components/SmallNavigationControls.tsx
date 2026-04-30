import { IconButton, Stack } from '@linagora/twake-mui'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import { useI18n } from 'twake-i18n'

export const SmallNavigationControls: React.FC<{
  onNavigate: (action: 'today' | 'next' | 'prev') => void
}> = ({ onNavigate }) => {
  const { t } = useI18n()

  return (
    <div className="navigation-controls">
      <Stack direction="row" spacing={1.25}>
        <IconButton
          onClick={() => onNavigate('prev')}
          aria-label={t('menubar.prev')}
          title={t('menubar.prev')}
        >
          <ChevronLeftIcon sx={{ height: 30 }} />
        </IconButton>
        <IconButton
          color="primary"
          aria-label={t('menubar.today')}
          title={t('menubar.today')}
          sx={{
            border: '1px solid',
            borderRadius: '12px',
            width: '38px',
            height: '38px'
          }}
          size="small"
          onClick={() => onNavigate('today')}
        >
          <TodayIcon fontSize="inherit" />
        </IconButton>
        <IconButton
          onClick={() => onNavigate('next')}
          aria-label={t('menubar.next')}
          title={t('menubar.next')}
        >
          <ChevronRightIcon sx={{ height: 30 }} />
        </IconButton>
      </Stack>
    </div>
  )
}
