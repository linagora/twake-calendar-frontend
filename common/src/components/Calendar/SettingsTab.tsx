import { useAppSelector } from '@common/app/hooks'
import { canAdministerCalendar } from '@common/features/Calendars/utils/calendarPermissions'
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
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
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
}): JSX.Element {
  const { t } = useI18n()
  const inputSize = useResponsiveInputSize()
  const [toggleDesc, setToggleDesc] = useState(Boolean(description))
  const userData = useAppSelector(state => state.user.userData)
  const userId = userData?.openpaasId ?? ''
  const isOwn = calendar ? extractEventBaseUuid(calendar.id) === userId : true
  // The public visibility is managed by whoever administers the calendar: its
  // owner, or an administrator of a shared, team or resource calendar.
  const canManageVisibility = calendar
    ? canAdministerCalendar(calendar, userData ?? {})
    : true
  // Somebody a calendar is lent to without the administration right still
  // reads its public visibility from their own instance of it, where Sabre
  // carries it over: shown, but not theirs to change.
  const showsVisibility = canManageVisibility || Boolean(calendar?.delegated)
  const theme = useTheme()
  const infoIconColor = alpha(theme.palette.grey[900], 0.9)
  const infoIconSx = { minWidth: '25px', marginRight: 2, color: infoIconColor }

  const isResource = useMemo(
    () => calendar?.owner?.resource,
    [calendar?.owner?.resource]
  )

  const isTeam = useMemo(
    () => Boolean(calendar?.owner?.teamCalendar),
    [calendar?.owner?.teamCalendar]
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
          component="p"
          variant="h6"
          sx={{ margin: 0, marginBottom: isResource || isTeam ? '16px' : 0 }}
        >
          {t(
            isTeam
              ? 'calendarPopover.settings.teamCalendarName'
              : isResource
                ? 'calendarPopover.settings.resourceName'
                : 'calendarPopover.settings.calendarName'
          )}
        </Typography>
        <Box sx={{ marginTop: '6px' }}>
          {isResource || isTeam ? (
            <InfoRow
              alignItems="flex-start"
              icon={
                <Box sx={infoIconSx}>
                  {isTeam ? <GroupsOutlinedIcon /> : <LayersOutlinedIcon />}
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
              disabled={!isOwn}
              onChange={e => setName(e.target.value)}
              size={inputSize}
              slotProps={{
                htmlInput: {
                  'aria-label': t('common.name'),
                  // Save stays disabled while the name is empty
                  'aria-required': true
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
      {!isResource && !isTeam && (
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
        <Typography component="p" variant="h6" sx={{ margin: 0 }}>
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
      {showsVisibility && (
        <Box sx={{ mt: 2 }}>
          <Typography component="p" variant="h6" sx={{ margin: 0 }}>
            {t('calendar.newEventsVisibility')}
          </Typography>
          <Box sx={{ marginTop: '6px' }}>
            <ToggleButtonGroup
              aria-label={t('calendar.newEventsVisibility')}
              value={visibility}
              exclusive
              disabled={!canManageVisibility}
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
