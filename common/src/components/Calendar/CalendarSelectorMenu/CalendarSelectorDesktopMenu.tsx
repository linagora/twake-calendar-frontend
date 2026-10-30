import React, { useMemo } from 'react'
import { Divider, Menu, MenuItem } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

interface CalendarSelectorDesktopMenuProps {
  id: string
  anchorEl: HTMLElement | null
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

export const CalendarSelectorDesktopMenu: React.FC<
  CalendarSelectorDesktopMenuProps
> = ({
  id,
  anchorEl,
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

  const isEnableDelete = useMemo(
    () => !isDefault && !isTeam,
    [isDefault, isTeam]
  )

  return (
    <Menu id={id} anchorEl={anchorEl} open={open} onClose={onClose}>
      {onToggleVisibility !== undefined && (
        <MenuItem
          onClick={() => {
            onToggleVisibility()
            onClose()
          }}
        >
          {isVisible ? t('actions.hide') : t('actions.show')}
        </MenuItem>
      )}
      {onToggleVisibility !== undefined && <Divider />}
      <MenuItem
        onClick={() => {
          onModify()
          onClose()
        }}
      >
        {t('actions.modify')}
      </MenuItem>
      {onShare !== undefined && <Divider />}
      {onShare !== undefined && (
        <MenuItem
          onClick={() => {
            onShare()
            onClose()
          }}
        >
          {t('calendar.share')}
        </MenuItem>
      )}
      {onPrint !== undefined && <Divider />}
      {onPrint !== undefined && (
        <MenuItem
          onClick={() => {
            onPrint()
            onClose()
          }}
        >
          {t('print.action')}
        </MenuItem>
      )}
      {isEnableDelete && (
        <>
          <Divider />
          <MenuItem
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            {isPersonal ? t('actions.delete') : t('actions.remove')}
          </MenuItem>
        </>
      )}
    </Menu>
  )
}
