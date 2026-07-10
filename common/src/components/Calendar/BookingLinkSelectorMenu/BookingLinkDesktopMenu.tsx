import React from 'react'
import { Menu, MenuItem } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface BookingLinkDesktopMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}

export const BookingLinkDesktopMenu: React.FC<BookingLinkDesktopMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onDelete,
  onEdit
}) => {
  const { t } = useI18n()

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        {t('actions.edit')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        {t('actions.delete')}
      </MenuItem>
    </Menu>
  )
}
