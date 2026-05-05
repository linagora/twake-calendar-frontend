import { AccessRight } from '@/features/Calendars/CalendarTypes'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  styled,
  SwipeableDrawer,
  Typography
} from '@linagora/twake-mui'
import { MobileSelector } from '../../MobileSelector'

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

export const AccessSelector: React.FC<{
  accessRight: AccessRight
  setAccessRight: (r: AccessRight) => void
  accessRightOptions: { value: AccessRight; label: string }[]
  disabled?: boolean
}> = ({ accessRight, setAccessRight, accessRightOptions, disabled }) => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  if (isMobile) {
    const displayText = accessRightOptions.find(
      right => right.value === accessRight
    )?.label

    return (
      <MobileAccessSelector
        displayText={displayText}
        disabled={disabled}
        accessRightOptions={accessRightOptions}
        accessRight={accessRight}
        setAccessRight={setAccessRight}
      />
    )
  }

  return (
    <DesktopAccessSelector
      accessRight={accessRight}
      setAccessRight={setAccessRight}
      disabled={disabled}
      accessRightOptions={accessRightOptions}
    />
  )
}

const DesktopAccessSelector: React.FC<{
  accessRight: number
  setAccessRight: (r: AccessRight) => void
  disabled: boolean | undefined
  accessRightOptions: { value: AccessRight; label: string }[]
}> = ({ accessRight, setAccessRight, disabled, accessRightOptions }) => {
  return (
    <Select
      value={accessRight}
      onChange={e => setAccessRight(e.target.value as AccessRight)}
      variant="standard"
      disableUnderline
      disabled={disabled}
      sx={{
        fontSize: '0.875rem',
        color: 'text.secondary',
        '& .MuiSelect-select': {
          paddingRight: '24px !important',
          paddingY: 0
        },
        '& .MuiSelect-icon': { fontSize: '1rem' },
        '&:before, &:after': { display: 'none' }
      }}
    >
      {accessRightOptions.map(opt => (
        <MenuItem
          key={opt.value}
          value={opt.value}
          sx={{ color: 'text.secondary' }}
        >
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  )
}
const MobileAccessSelector: React.FC<{
  displayText: string | undefined
  disabled: boolean | undefined
  accessRightOptions: { value: AccessRight; label: string }[]
  accessRight: number
  setAccessRight: (r: AccessRight) => void
}> = ({
  displayText,
  disabled,
  accessRightOptions,
  accessRight,
  setAccessRight
}) => {
  return (
    <MobileSelector
      displayText={displayText}
      disabled={disabled}
      selectorButtonSx={{
        '& .MuiTypography-root': {
          fontSize: '0.875rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }}
      bottomSheetChildren={
        disabled
          ? undefined
          : ({ open, onClose }) => (
              <StyledSwipeableDrawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                onOpen={(): void => {}}
              >
                <List sx={{ overflow: 'auto', flex: 1, pt: 0 }}>
                  {accessRightOptions.map(opt => (
                    <ListItemButton
                      key={opt.value}
                      selected={opt.value === accessRight}
                      onClick={() => {
                        setAccessRight(opt.value)
                        onClose()
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography>{opt.label}</Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </StyledSwipeableDrawer>
            )
      }
    />
  )
}
