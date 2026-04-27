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
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.palette.text.primary
  }
}))

interface MobileSelectorProps {
  displayText: React.ReactNode
  children?: React.ReactNode
  bottomSheetRef?: React.RefObject<HTMLDivElement>
  paperRef?: React.RefObject<HTMLDivElement>
  bottomSheetChildren?: (props: {
    open: boolean
    onClose: () => void
  }) => React.ReactNode
  fullscreen?: boolean
}

export const MobileSelector = forwardRef<
  MobileSelectorHandle,
  MobileSelectorProps
>(({ displayText, children, bottomSheetChildren, fullscreen }, ref) => {
  const [open, setOpen] = useState(false)
  const onClose = (): void => setOpen(false)

  useImperativeHandle(ref, () => ({ open, onClose }))

  return (
    <>
      <SelectorButton onClick={() => setOpen(true)}>
        {typeof displayText === 'string' ? (
          <Typography variant="body1">{displayText}</Typography>
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
      </SelectorButton>
      {children ? (
        <StyledSwipeableDrawer
          anchor="bottom"
          open={open}
          onClose={onClose}
          onOpen={(): void => {}}
          disableAutoFocus
          slotProps={{
            paper: {
              sx: fullscreen ? { height: '100dvh' } : { maxHeight: '90dvh' }
            }
          }}
        >
          {children}
        </StyledSwipeableDrawer>
      ) : (
        bottomSheetChildren?.({ open, onClose })
      )}
    </>
  )
})

MobileSelector.displayName = 'MobileSelector'
