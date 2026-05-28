import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { Box, Button } from '@linagora/twake-mui'
import AddIcon from '@mui/icons-material/Add'
import { useI18n } from 'twake-i18n'

interface EventActionsProps {
  showExpandedBtn: boolean
  isEdit?: boolean
  onExpanded: () => void
  onClose: () => void
  onSave: () => Promise<void>
}

export const EventActions: React.FC<EventActionsProps> = ({
  showExpandedBtn,
  isEdit,
  onExpanded,
  onClose,
  onSave
}) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const buttonSize = isMobile ? 'small' : 'medium'

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        px: 2
      }}
    >
      {showExpandedBtn && (
        <Button size={buttonSize} startIcon={<AddIcon />} onClick={onExpanded}>
          {t('common.moreOptions')}
        </Button>
      )}
      <Box sx={{ display: 'flex', gap: 1, ml: !showExpandedBtn ? 'auto' : 0 }}>
        {(!showExpandedBtn || isEdit) && (
          <Button size={buttonSize} variant="outlined" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          size={buttonSize}
          variant="contained"
          onClick={() => void onSave()}
        >
          {t('actions.save')}
        </Button>
      </Box>
    </Box>
  )
}
