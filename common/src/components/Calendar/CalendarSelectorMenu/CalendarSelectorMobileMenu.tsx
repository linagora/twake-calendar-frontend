import React from 'react'
import {
  styled,
  SwipeableDrawer,
  List,
  ListItemButton
} from '@linagora/twake-mui'
import { ListItemText } from '@common/ds/ListItemText/ListItemText'
import { useI18n } from 'twake-i18n'

const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 100
}))

interface CalendarSelectorMobileMenuProps {
  open: boolean
  onClose: () => void
  onModify: () => void
  onShare?: () => void
  onDelete: () => void
  onToggleVisibility?: () => void
  onPrint?: () => void
  isDefault: boolean
  isPersonal: boolean
  isVisible?: boolean
  isTeam?: boolean
}

export const CalendarSelectorMobileMenu: React.FC<
  CalendarSelectorMobileMenuProps
> = ({
  open,
  onClose,
  onModify,
  onShare,
  onDelete,
  onToggleVisibility,
  onPrint,
  isDefault,
  isPersonal,
  isVisible,
  isTeam
}) => {
  const { t } = useI18n()

  return (
    <StyledSwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
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
        {onShare !== undefined && (
          <ListItemButton
            onClick={() => {
              onShare()
              onClose()
            }}
          >
            <ListItemText primary={t('calendar.share')} />
          </ListItemButton>
        )}
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
        {!isDefault && !isTeam && (
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
