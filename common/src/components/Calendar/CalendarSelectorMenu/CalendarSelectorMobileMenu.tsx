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

interface CalendarSelectorMobileMenuProps {
  open: boolean
  onClose: () => void
  onModify: () => void
  onDelete: () => void
  onToggleVisibility?: () => void
  onPrint?: () => void
  isDefault: boolean
  isPersonal: boolean
  isVisible?: boolean
}

export const CalendarSelectorMobileMenu: React.FC<
  CalendarSelectorMobileMenuProps
> = ({
  open,
  onClose,
  onModify,
  onDelete,
  onToggleVisibility,
  onPrint,
  isDefault,
  isPersonal,
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
            onModify()
            onClose()
          }}
        >
          <ListItemText primary={t('actions.modify')} />
        </ListItemButton>
        {onPrint !== undefined && (
          <ListItemButton
            onClick={() => {
              onPrint()
              onClose()
            }}
          >
            <ListItemText primary={t('print.action')} />
          </ListItemButton>
        )}
        {!isDefault && (
          <ListItemButton
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            <ListItemText
              primary={isPersonal ? t('actions.delete') : t('actions.remove')}
              slotProps={{
                primary: {
                  color: 'error.main'
                }
              }}
            />
          </ListItemButton>
        )}
      </List>
    </StyledSwipeableDrawer>
  )
}
