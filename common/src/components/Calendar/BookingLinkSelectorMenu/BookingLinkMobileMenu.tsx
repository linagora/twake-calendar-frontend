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
  onToggleVisibility?: () => void
  isVisible?: boolean
}

export const BookingLinkMobileMenu: React.FC<BookingLinkMobileMenuProps> = ({
  open,
  onClose,
  onDelete,
  onEdit,
  onToggleVisibility,
  isVisible
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
        {onToggleVisibility !== undefined && (
          <ListItemButton
            onClick={() => {
              onToggleVisibility()
              onClose()
            }}
          >
            <ListItemText
              primary={isVisible ? t('actions.hide') : t('actions.show')}
            />
          </ListItemButton>
        )}
        <ListItemButton
          onClick={() => {
            onEdit()
            onClose()
          }}
        >
          <ListItemText primary={t('actions.modify')} />
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
