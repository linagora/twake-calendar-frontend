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
  onEdit: () => void
}

export const BookingLinkMobileMenu: React.FC<BookingLinkMobileMenuProps> = ({
  open,
  onClose,
  onDelete,
  onEdit
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
            onEdit()
            onClose()
          }}
        >
          <ListItemText primary={t('actions.edit')} />
        </ListItemButton>
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
