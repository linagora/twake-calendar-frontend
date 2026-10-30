import React, { useMemo } from 'react'
import {
  ActionsMenu,
  ActionsMenuItem,
  Divider,
  ListItemText
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface CalendarSelectorMenuProps {
  id: string
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onModify: () => void
  onDelete: () => void
  onToggleVisibility?: () => void
  onPrint?: () => void
  isDefault: boolean
  isPersonal: boolean
  isVisible?: boolean
  isTeam?: boolean
}

export const CalendarSelectorMenu: React.FC<CalendarSelectorMenuProps> = ({
  id,
  anchorEl,
  open,
  onClose,
  onModify,
  onDelete,
  onToggleVisibility,
  onPrint,
  isDefault,
  isPersonal,
  isVisible,
  isTeam
}) => {
  const { t } = useI18n()
  // ActionsMenu anchors on its ref, not on an anchorEl prop
  const anchorRef = useMemo(() => ({ current: anchorEl }), [anchorEl])

  return (
    <ActionsMenu id={id} ref={anchorRef} open={open} onClose={onClose}>
      {onToggleVisibility !== undefined && (
        <ActionsMenuItem onClick={onToggleVisibility}>
          <ListItemText
            primary={isVisible ? t('actions.hide') : t('actions.show')}
          />
        </ActionsMenuItem>
      )}
      {onToggleVisibility !== undefined && <Divider />}
      <ActionsMenuItem onClick={onModify}>
        <ListItemText primary={t('actions.modify')} />
      </ActionsMenuItem>
      {onPrint !== undefined && <Divider />}
      {onPrint !== undefined && (
        <ActionsMenuItem onClick={onPrint}>
          <ListItemText primary={t('print.action')} />
        </ActionsMenuItem>
      )}
      {!isDefault && !isTeam && <Divider />}
      {!isDefault && !isTeam && (
        <ActionsMenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <ListItemText
            primary={isPersonal ? t('actions.delete') : t('actions.remove')}
          />
        </ActionsMenuItem>
      )}
    </ActionsMenu>
  )
}
