import React from 'react'
import {
  styled,
  SwipeableDrawer,
  List,
  ListItemButton,
  ListItemText
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

interface BookingLinkMobileMenuProps {
  open: boolean
  onClose: () => void
  onDelete: () => void
}

export const BookingLinkMobileMenu: React.FC<BookingLinkMobileMenuProps> = ({
  open,
  onClose,
  onDelete
}) => {
  const { t } = useI18n()

  return (
    <StyledSwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableAutoFocus
    >
      <List>
        <ListItemButton
          onClick={() => {
            onDelete()
            onClose()
          }}
        >
          <ListItemText
            primary={t('actions.delete')}
            slotProps={{
              primary: {
                color: 'error.main'
              }
            }}
          />
        </ListItemButton>
      </List>
    </StyledSwipeableDrawer>
  )
}
