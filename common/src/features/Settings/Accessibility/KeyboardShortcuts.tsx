import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@linagora/twake-mui'
import { useId } from 'react'
import { useI18n } from 'twake-i18n'

const SHORTCUT_COUNT = 9

/**
 * The keyboard usage of the application (R-10), also documented in
 * accessibility/KEYBOARD.md.
 */
export const KeyboardShortcuts: React.FC = () => {
  const { t } = useI18n()
  const titleId = useId()

  return (
    <Box sx={{ mb: 4 }}>
      <Typography id={titleId} component="h2" variant="h6" sx={{ mb: 1 }}>
        {t('settings.accessibility.keyboard.title')}
      </Typography>
      <Table size="small" aria-labelledby={titleId} sx={{ maxWidth: 720 }}>
        <caption>{t('settings.accessibility.keyboard.caption')}</caption>
        <TableHead>
          <TableRow>
            <TableCell component="th" scope="col">
              {t('settings.accessibility.keyboard.keys')}
            </TableCell>
            <TableCell component="th" scope="col">
              {t('settings.accessibility.keyboard.action')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: SHORTCUT_COUNT }, (_, index) => index + 1).map(
            row => (
              <TableRow key={row}>
                <TableCell component="th" scope="row">
                  <kbd>{t(`settings.accessibility.keyboard.key${row}`)}</kbd>
                </TableCell>
                <TableCell>
                  {t(`settings.accessibility.keyboard.action${row}`)}
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </Box>
  )
}
