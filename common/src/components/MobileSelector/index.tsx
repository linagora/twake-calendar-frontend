import {
  Box,
  ButtonBase,
  styled,
  SwipeableDrawer,
  Typography
} from '@linagora/twake-mui'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import React, { forwardRef, useImperativeHandle, useState } from 'react'

export interface MobileSelectorHandle {
  open: boolean
  onClose: () => void
}

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

const SelectorButton = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 2),
  border: `1px solid ${theme.vars.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.vars.palette.background.paper,
  color: theme.vars.palette.text.secondary,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.vars.palette.text.primary
  }
}))

// "Theme: Dark". A value that is not plain text (e.g. a calendar name with
// its colour) keeps naming the button by its content.
function triggerLabel(
  label: string | undefined,
  displayText: React.ReactNode
): string | undefined {
  if (!label) return undefined
  if (typeof displayText !== 'string') return displayText ? undefined : label
  return displayText === label ? label : `${label}: ${displayText}`
}

interface MobileSelectorProps {
  displayText: React.ReactNode
  children?: React.ReactNode
  bottomSheetRef?: React.RefObject<HTMLDivElement>
  paperRef?: React.RefObject<HTMLDivElement>
  /** Renders a sheet of its own, named after `label` */
  bottomSheetChildren?: (props: {
    open: boolean
    onClose: () => void
    label?: string
  }) => React.ReactNode
  fullscreen?: boolean
  selectorButtonSx?: React.ComponentProps<typeof ButtonBase>['sx']
  disabled?: boolean
  /**
   * What the field sets, e.g. "Theme": names the button "Theme: Dark" and
   * the bottom sheet "Theme"
   */
  label?: string
}

export const MobileSelector = forwardRef<
  MobileSelectorHandle,
  MobileSelectorProps
>(
  (
    {
      displayText,
      children,
      bottomSheetChildren,
      fullscreen,
      selectorButtonSx,
      disabled,
      label
    },
    ref
  ) => {
    const [open, setOpen] = useState(false)
    const onClose = (): void => setOpen(false)

    useImperativeHandle(ref, () => ({ open, onClose }))

    const ButtonComponent = selectorButtonSx ? ButtonBase : SelectorButton

    return (
      <>
        <ButtonComponent
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
          sx={selectorButtonSx}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel(label, displayText)}
        >
          {typeof displayText === 'string' ? (
            <Typography variant="body1" noWrap>
              {displayText}
            </Typography>
          ) : (
            displayText
          )}
          <Box
            component={ArrowDropDownIcon}
            sx={{
              fontSize: 20,
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </ButtonComponent>
        {children ? (
          <StyledSwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={(): void => {}}
            slotProps={{
              paper: {
                'aria-label': label,
                sx: fullscreen ? { height: '100dvh' } : { maxHeight: '90dvh' }
              }
            }}
          >
            {children}
          </StyledSwipeableDrawer>
        ) : (
          bottomSheetChildren?.({ open, onClose, label })
        )}
      </>
    )
  }
)

MobileSelector.displayName = 'MobileSelector'
