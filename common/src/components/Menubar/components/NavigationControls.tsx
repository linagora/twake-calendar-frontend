import { Tooltip } from '@common/components/Tooltip'
import { Button, ButtonGroup } from '@linagora/twake-mui'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useI18n } from 'twake-i18n'

export const NavigationControls: React.FC<{
  onNavigate: (action: 'today' | 'next' | 'prev') => void
}> = ({ onNavigate }) => {
  const { t } = useI18n()
  return (
    <div className="navigation-controls">
      <ButtonGroup
        variant="outlined"
        size="medium"
        sx={{
          '& button:first-of-type': { borderRadius: '12px 0 0 12px' },
          '& button:last-of-type': { borderRadius: '0 12px 12px 0' }
        }}
      >
        <Tooltip title={t('menubar.prev')}>
          <Button
            sx={{ width: 20 }}
            onClick={() => onNavigate('prev')}
            aria-label={t('menubar.prev')}
          >
            <ChevronLeftIcon sx={{ height: 20 }} />
          </Button>
        </Tooltip>
        <Tooltip title={t('menubar.today')}>
          <Button onClick={() => onNavigate('today')}>
            {t('menubar.today')}
          </Button>
        </Tooltip>
        <Tooltip title={t('menubar.next')}>
          <Button
            sx={{ width: 20 }}
            onClick={() => onNavigate('next')}
            aria-label={t('menubar.next')}
          >
            <ChevronRightIcon sx={{ height: 20 }} />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
