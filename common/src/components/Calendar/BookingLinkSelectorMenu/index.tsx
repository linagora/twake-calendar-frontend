import React, { useMemo } from 'react'
import {
  ActionsMenu,
  ActionsMenuItem,
  Divider,
  ListItemText
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface BookingLinkSelectorMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
  onToggleVisibility?: () => void
  isVisible?: boolean
}

export const BookingLinkSelectorMenu: React.FC<
  BookingLinkSelectorMenuProps
> = ({
  anchorEl,
  open,
  onClose,
  onDelete,
  onEdit,
  onToggleVisibility,
  isVisible
}) => {
  const { t } = useI18n()
  // ActionsMenu anchors on its ref, not on an anchorEl prop
  const anchorRef = useMemo(() => ({ current: anchorEl }), [anchorEl])

  return (
    <ActionsMenu ref={anchorRef} open={open} onClose={onClose}>
      {onToggleVisibility !== undefined && (
        <ActionsMenuItem onClick={onToggleVisibility}>
          <ListItemText
            primary={isVisible ? t('actions.hide') : t('actions.show')}
          />
        </ActionsMenuItem>
      )}
      {onToggleVisibility !== undefined && <Divider />}
      <ActionsMenuItem onClick={onEdit}>
        <ListItemText primary={t('actions.modify')} />
      </ActionsMenuItem>
      <ActionsMenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
        <ListItemText primary={t('actions.delete')} />
      </ActionsMenuItem>
    </ActionsMenu>
  )
}
