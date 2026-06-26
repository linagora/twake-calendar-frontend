import { CalDavLink } from '@common/features/Calendars/types/CalendarApiTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { renameDefault } from '@common/utils/renameDefault'
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  useTheme
} from '@linagora/twake-mui'
import CloseIcon from '@mui/icons-material/Close'
import { useI18n } from 'twake-i18n'
import { User } from '@common/components/Attendees/types'
import { stringAvatar } from '@common/components/Event/utils/eventUtils'
import { ColorPicker } from '@common/components/Calendar/CalendarColorPicker'
import { getAccessiblePair } from '@common/utils/getAccessiblePair'
import { defaultColors } from '@common/utils/defaultColors'
import { CalendarWithOwner } from './index.types'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { ResourceIcon } from '@common/components/Attendees/ResourceIcon'

const ResourceItem: React.FC<{
  cal: CalendarWithOwner
  onRemove: () => void
  onColorChange: (color: Record<string, string>) => void
}> = ({ cal, onRemove, onColorChange }) => {
  const theme = useTheme()
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  return (
    <Box
      key={cal.cal['dav:name']}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ResourceIcon avatarUrl={cal.owner.avatarUrl} />
        <Typography variant="body1">
          {renameDefault(cal.cal['dav:name'], cal.owner.displayName, t, false)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ColorPicker
          selectedColor={{
            light: cal.cal['apple:color'] ?? defaultColors[0].light,
            dark: cal.cal['apple:color']
              ? getAccessiblePair(cal.cal['apple:color'], theme)
              : defaultColors[0].dark
          }}
          onChange={onColorChange}
        />
        <IconButton
          size="small"
          onClick={onRemove}
          aria-label="Remove calendar"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

const OtherCalendarItem: React.FC<{
  cal: CalendarWithOwner
  onRemove: () => void
  onColorChange: (color: Record<string, string>) => void
}> = ({ cal, onRemove, onColorChange }) => {
  const theme = useTheme()
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  return (
    <Box
      key={cal.owner.email + cal.cal['dav:name']}
      style={{
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        padding: 8,
        marginBottom: 8
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Avatar
          {...stringAvatar(cal.owner.displayName || cal.owner.email)}
          style={{
            border: `2px solid ${cal.cal['apple:color'] || defaultColors[0].light}`,
            boxShadow: cal.cal['apple:color']
              ? `0 0 0 2px ${cal.cal['apple:color']}`
              : `0 0 0 2px ${defaultColors[0].light}`
          }}
        />
        <Box>
          <Typography variant="body1">
            {renameDefault(
              cal.cal['dav:name'],
              cal.owner.displayName,
              t,
              false
            )}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {cal.owner.email}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ColorPicker
          colors={
            isMobile ? defaultColors.slice(0, 3) : defaultColors.slice(0, 4)
          }
          selectedColor={{
            light: cal.cal['apple:color'] ?? defaultColors[0].light,
            dark: cal.cal['apple:color']
              ? getAccessiblePair(cal.cal['apple:color'], theme)
              : defaultColors[0].dark
          }}
          onChange={onColorChange}
        />
        <IconButton
          size="small"
          onClick={onRemove}
          aria-label="Remove calendar"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

export const SelectedCalendarsList: React.FC<{
  keyName: 'email' | 'displayName'
  calendars: Record<string, Calendar>
  selectedCal: CalendarWithOwner[]
  onRemove: (cal: CalendarWithOwner) => void
  onColorChange: (cal: CalendarWithOwner, color: Record<string, string>) => void
}> = ({ keyName, calendars, selectedCal, onRemove, onColorChange }) => {
  const { t } = useI18n()
  if (selectedCal.length === 0) return null

  const ItemComponent = keyName === 'email' ? OtherCalendarItem : ResourceItem

  const groupedByOwner = selectedCal.reduce<
    Record<
      string,
      {
        owner: User
        visibleCals: CalendarWithOwner[]
        alreadyExisting: boolean
      }
    >
  >((acc, cal) => {
    const exists = Object.values(calendars).some(
      (existing: Calendar) =>
        existing.id === new CalDavLink(cal.cal?._links).parseCalendarId()
    )

    if (!acc[cal.owner[keyName]]) {
      acc[cal.owner[keyName]] = {
        owner: cal.owner,
        visibleCals: [],
        alreadyExisting: false
      }
    }

    if (exists) {
      acc[cal.owner[keyName]].alreadyExisting = true
    } else {
      acc[cal.owner[keyName]].visibleCals.push(cal)
    }

    return acc
  }, {})

  return (
    <Box sx={{ mt: 2 }}>
      {keyName === 'email' ? (
        <Typography variant="subtitle1" gutterBottom>
          {t('common.name')}
        </Typography>
      ) : (
        <Typography variant="h6" sx={{ margin: 0, marginBottom: 1 }}>
          {t('common.resource')}
        </Typography>
      )}

      {Object.values(groupedByOwner).map(
        ({
          owner,
          visibleCals,
          alreadyExisting
        }: {
          owner: User
          visibleCals: CalendarWithOwner[]
          alreadyExisting: boolean
        }) => (
          <Box key={owner[keyName]} sx={{ mb: 2 }}>
            {visibleCals.length > 0 ? (
              visibleCals.map(cal =>
                cal.cal ? (
                  <ItemComponent
                    key={cal.owner[keyName] + cal.cal['dav:name']}
                    cal={cal}
                    onRemove={() => onRemove(cal)}
                    onColorChange={color => onColorChange(cal, color)}
                  />
                ) : (
                  <Typography
                    key={t('calendar.noPublicCalendarsFor', {
                      name: owner.displayName
                    })}
                    color="textSecondary"
                  >
                    {t('calendar.noPublicCalendarsFor', {
                      name: owner.displayName
                    })}
                  </Typography>
                )
              )
            ) : alreadyExisting ? (
              <Typography
                key={t('calendar.noMoreCalendarsFor', {
                  name: owner.displayName
                })}
                color="textSecondary"
              >
                {t('calendar.noMoreCalendarsFor', { name: owner.displayName })}
              </Typography>
            ) : null}
          </Box>
        )
      )}
    </Box>
  )
}
