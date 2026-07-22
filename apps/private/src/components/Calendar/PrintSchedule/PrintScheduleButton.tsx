import Tooltip from '@common/components/Tooltip'
import { Button } from '@linagora/twake-mui'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { PrintScheduleModal } from './PrintScheduleModal'

export const PrintScheduleButton: React.FC<{
  selectedCalendars: string[]
}> = ({ selectedCalendars }) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title={t('tooltip.printSchedule')}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<PrintOutlinedIcon fontSize="small" />}
          onClick={() => setOpen(true)}
          sx={{ justifyContent: 'flex-start' }}
        >
          {t('print.action')}
        </Button>
      </Tooltip>
      <PrintScheduleModal
        open={open}
        onClose={() => setOpen(false)}
        selectedCalendars={selectedCalendars}
      />
    </>
  )
}
