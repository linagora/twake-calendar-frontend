import { ResponsiveDialog } from '@common/components/Dialog'
import { calendarShortcutRows } from '@common/hooks/useCalendarShortcuts'
import { Box } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export function KeyboardShortcutsDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): JSX.Element {
  const { t } = useI18n()
  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={t('shortcuts.title')}
    >
      <Box
        component="table"
        sx={{ width: '100%', '& th, & td': { p: 1, textAlign: 'left' } }}
      >
        <tbody>
          {calendarShortcutRows.map(([keys, label]) => (
            <tr key={keys}>
              <th scope="row">
                <kbd>{keys}</kbd>
              </th>
              <td>{t(label)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </ResponsiveDialog>
  )
}
