import { AccessRight } from '@common/types/CalendarTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import {
  Box,
  List,
  ListItemButton,
  MenuItem,
  Select,
  styled,
  SwipeableDrawer,
  Typography
} from '@linagora/twake-mui'
import { ListItemText } from '@common/ds/ListItemText/ListItemText'
import { MobileSelector } from '@common/components/MobileSelector'

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

export interface AccessRightOption {
  value: AccessRight
  label: string
  /** What the right allows, shown under its label in the list */
  description: string
}

export const AccessSelector: React.FC<{
  accessRight: AccessRight
  setAccessRight: (r: AccessRight) => void
  accessRightOptions: AccessRightOption[]
  disabled?: boolean
  /** Names the selector, e.g. "Access right of Bob" */
  label?: string
}> = ({ accessRight, setAccessRight, accessRightOptions, disabled, label }) => {
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
        label={label}
      />
    )
  }

  return (
    <DesktopAccessSelector
      accessRight={accessRight}
      setAccessRight={setAccessRight}
      disabled={disabled}
      accessRightOptions={accessRightOptions}
      label={label}
    />
  )
}

const DesktopAccessSelector: React.FC<{
  accessRight: number
  setAccessRight: (r: AccessRight) => void
  disabled: boolean | undefined
  accessRightOptions: AccessRightOption[]
  label?: string
}> = ({ accessRight, setAccessRight, disabled, accessRightOptions, label }) => {
  return (
    <Select
      value={accessRight}
      inputProps={{ 'aria-label': label }}
      // the list shows each right with its description, the field its name only
      renderValue={value =>
        accessRightOptions.find(opt => opt.value === value)?.label
      }
      onChange={e => setAccessRight(e.target.value as AccessRight)}
      variant="standard"
      disableUnderline
      disabled={disabled}
      sx={{
        fontSize: '0.875rem',
        color: 'text.secondary',
        minWidth: 'max-content',
        '& .MuiSelect-select': {
          paddingRight: '24px !important',
          paddingY: 0,
          // inside the people field, the Autocomplete caps its inputs at 80%:
          // the selected right would be cut
          maxWidth: 'none'
        },
        '& .MuiSelect-icon': { fontSize: '1rem' },
        '&:before, &:after': { display: 'none' }
      }}
    >
      {accessRightOptions.map(opt => (
        <MenuItem
          key={opt.value}
          value={opt.value}
          sx={{ color: 'text.secondary', maxWidth: 360 }}
        >
          <ListItemText
            primary={opt.label}
            secondary={opt.description}
            slotProps={{ secondary: { sx: { whiteSpace: 'normal' } } }}
          />
        </MenuItem>
      ))}
    </Select>
  )
}
const MobileAccessSelector: React.FC<{
  displayText: string | undefined
  disabled: boolean | undefined
  accessRightOptions: AccessRightOption[]
  accessRight: number
  setAccessRight: (r: AccessRight) => void
  label?: string
}> = ({
  displayText,
  disabled,
  accessRightOptions,
  accessRight,
  setAccessRight,
  label
}) => {
  return (
    <MobileSelector
      displayText={displayText}
      disabled={disabled}
      label={label}
      selectorButtonSx={{
        '& .MuiTypography-root': {
          fontSize: '0.875rem',
          color: 'text.secondary',
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
                        secondary={opt.description}
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
