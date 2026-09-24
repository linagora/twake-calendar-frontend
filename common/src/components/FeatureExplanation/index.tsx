import {
  setShowFeatureExplanations,
  useShowFeatureExplanations
} from '@common/utils/storage/featureExplanations'
import {
  Box,
  Button,
  IconButton,
  Popover,
  Typography
} from '@linagora/twake-mui'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import { MouseEvent, useState } from 'react'
import { useI18n } from 'twake-i18n'

/**
 * A "?" button that explains, on click, what a feature is about. Shown as
 * long as the user did not opt out of feature explanations, either from the
 * explanation itself or from the settings.
 */
export const FeatureExplanation: React.FC<{
  label: string
  explanation: string
}> = ({ label, explanation }) => {
  const { t } = useI18n()
  const showFeatureExplanations = useShowFeatureExplanations()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  if (!showFeatureExplanations) return null

  const handleOpen = (e: MouseEvent<HTMLElement>): void => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  // The popover is portalled, yet React still bubbles its clicks up to the
  // accordion header it is declared in, which would toggle that section.
  const stopBubbling = (e: MouseEvent<HTMLElement>): void => {
    e.stopPropagation()
  }

  const handleStopShowing = (): void => {
    setAnchorEl(null)
    setShowFeatureExplanations(false)
  }

  return (
    <>
      <IconButton
        component="span"
        size="small"
        aria-label={label}
        onClick={handleOpen}
      >
        <HelpOutlineOutlinedIcon fontSize="small" />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onClick={stopBubbling}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="body2">{explanation}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button size="small" onClick={handleStopShowing}>
              {t('featureExplanation.stopShowing')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  )
}
