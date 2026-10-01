import { Box, Button, Paper } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AttendeeOptionsList } from '@common/components/Attendees/AttendeeOptionsList'
import { User } from '@common/components/Attendees/types'

interface MobileSearchDialogProps {
  open: boolean
  showSearchButton: boolean
  onShow: () => void
  options: User[]
  selectedUsers: User[]
  onOptionClick: (user: User) => void
}

export function MobileSearchDialog({
  open,
  onShow,
  showSearchButton,
  options,
  selectedUsers,
  onOptionClick
}: MobileSearchDialogProps): JSX.Element {
  const { t } = useI18n()

  if (!open) return <></>

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        top: 'calc(70px + var(--twake-bar-height, 0px))',
        left: 0,
        right: 0,
        bottom: 0,
        p: 2,
        zIndex: theme => theme.zIndex.appBar - 1,
        borderRadius: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ flex: 1, mt: 1, overflowY: 'auto' }}>
        <AttendeeOptionsList
          options={options}
          onOptionClick={onOptionClick}
          selectedUsers={selectedUsers}
        />
      </Box>
      {showSearchButton && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              onShow()
            }}
          >
            {t('common.show')}
          </Button>
        </Box>
      )}
    </Paper>
  )
}
