import { useAppSelector } from '@common/app/hooks'
import { Calendar } from '@common/types/CalendarTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
  alpha
} from '@linagora/twake-mui'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import PublicIcon from '@mui/icons-material/Public'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { AddDescButton } from '@common/components/Event/AddDescButton'
import { ColorPicker } from './CalendarColorPicker'
import { InfoRow } from '@common/components/Event/InfoRow'
import { useResponsiveInputSize } from '@common/hooks/useResponsiveInputSize'

export function SettingsTab({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  visibility,
  setVisibility,
  calendar,
  autoFocusName
}: {
  name: string
  setName: (name: string) => void
  description: string
  setDescription: (d: string) => void
  color: Record<string, string>
  setColor: (color: Record<string, string>) => void
  visibility: 'public' | 'private'
  setVisibility: (visibility: 'public' | 'private') => void
  calendar?: Calendar
  autoFocusName?: boolean
}) {
  const { t } = useI18n()
  const inputSize = useResponsiveInputSize()
  const [toggleDesc, setToggleDesc] = useState(Boolean(description))
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const isOwn = calendar ? extractEventBaseUuid(calendar.id) === userId : true
  const theme = useTheme()
  const infoIconColor = alpha(theme.palette.grey[900], 0.9)
  const infoIconSx = { minWidth: '25px', marginRight: 2, color: infoIconColor }

  const isResource = useMemo(
    () => calendar?.owner?.resource,
    [calendar?.owner?.resource]
  )

  useEffect(() => {
    const handleToggleDesc = (): void => {
      if (description) setToggleDesc(true)
    }
    handleToggleDesc()
  }, [description])

  return (
    <>
      {/* Form group 1: Name field - first group, margin top 0 */}
      <Box sx={{ mt: 0 }}>
        <Typography
          variant="h6"
          sx={{ margin: 0, marginBottom: isResource ? '16px' : 0 }}
        >
          {t(
            isResource
              ? 'calendarPopover.settings.resourceName'
              : 'calendarPopover.settings.calendarName'
          )}
        </Typography>
        <Box sx={{ marginTop: '6px' }}>
          {isResource ? (
            <InfoRow
              alignItems="flex-start"
              icon={
                <Box sx={infoIconSx}>
                  <LayersOutlinedIcon />
                </Box>
              }
              text={name}
              style={{
                fontSize: '16px'
              }}
            />
          ) : (
            <TextField
              fullWidth
              label=""
              autoFocus={autoFocusName}
              placeholder={t('common.name')}
              value={name}
              onChange={e => setName(e.target.value)}
              size={inputSize}
              slotProps={{
                htmlInput: {
                  'aria-label': t('common.name')
                }
              }}
              sx={{
                '&.MuiFormControl-root': {
                  marginTop: 0,
                  marginBottom: 0
                }
              }}
            />
          )}
        </Box>
      </Box>

      {/* Form group 2: Description */}
      {!isResource && (
        <Box sx={{ mt: 2 }}>
          <AddDescButton
            showDescription={toggleDesc}
            setShowDescription={setToggleDesc}
            showMore={false}
            description={description}
            setDescription={setDescription}
          />
        </Box>
      )}

      {/* Form group 3: Color */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ margin: 0 }}>
          {t('calendar.color')}
        </Typography>
        <Box sx={{ marginTop: '6px' }}>
          <ColorPicker
            onChange={color => setColor(color)}
            selectedColor={color}
          />
        </Box>
      </Box>

      {/* Form group 4: New events visibility */}
      {isOwn && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ margin: 0 }}>
            {t('calendar.newEventsVisibility')}
          </Typography>
          <Box sx={{ marginTop: '6px' }}>
            <ToggleButtonGroup
              value={visibility}
              exclusive
              onChange={(e, val) => val && setVisibility(val)}
              size="medium"
              sx={{ borderRadius: '12px' }}
            >
              <ToggleButton value="public" sx={{ width: '140px' }}>
                <PublicIcon fontSize="small" sx={{ mr: 1 }} />
                {t('common.all')}
              </ToggleButton>

              <ToggleButton value="private" sx={{ width: '140px' }}>
                <LockOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                {t('common.you')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}
    </>
  )
}
