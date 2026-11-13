import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Snackbar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import {
  ActionAlert,
  AlertAction
} from '@common/components/Loading/SnackBarAlert'
import { useTdriveMove } from '../hooks/useTdriveMove'
import { MovedDriveFile, SavedDriveFile } from '../types'
import { TdrivePickerDialog } from './TdrivePickerDialog'

// Long enough to reach the Organise button
const SAVED_DURATION = 6000
const MOVED_DURATION = 4000

// A click away may be the one that opened the file: only the timeout and
// the close button dismiss the snackbars
const ignoringClickaway =
  (close: () => void) =>
  (_event?: React.SyntheticEvent | Event, reason?: string): void => {
    if (reason !== 'clickaway') close()
  }

interface SavedSnackbarContent {
  message: string
  duration: number
  action?: AlertAction
}

// Once the file got moved, tells where to, with nothing more to organise
function getSavedSnackbarContent(
  file: SavedDriveFile | null,
  moved: MovedDriveFile | null,
  t: (key: string, vars?: Record<string, string>) => string,
  onOrganise: (file: SavedDriveFile) => void
): SavedSnackbarContent {
  if (moved) {
    return {
      message: t('tdrive.movedTo', { path: moved.path }),
      duration: MOVED_DURATION
    }
  }
  return {
    message: t('tdrive.savedToDrive', { name: file?.name ?? '' }),
    duration: SAVED_DURATION,
    action: file
      ? { label: t('tdrive.organise'), onClick: () => onOrganise(file) }
      : undefined
  }
}

interface DriveSaveSnackbarProps {
  // The file just stored in the Calendar folder of the user's Drive, or null
  file: SavedDriveFile | null
  onClose: () => void
}

/**
 * Tells the user a file got saved to their Drive, and lets them organise it:
 * the Organise button opens the Drive MOVE intent in the Calendar folder.
 */
export const DriveSaveSnackbar: React.FC<DriveSaveSnackbarProps> = ({
  file,
  onClose
}) => {
  const { t } = useI18n()
  const [moved, setMoved] = useState<MovedDriveFile | null>(null)

  // A new saved file starts over
  useEffect(() => {
    setMoved(null)
  }, [file?.id])

  const onMoved = useCallback(
    (files: MovedDriveFile[]) => {
      // Every move succeeded, but the service may not tell where the file
      // went, e.g. when another one replaced it: nothing more to say then
      if (files.length === 0) onClose()
      else setMoved(files[0])
    },
    [onClose]
  )

  const {
    isOpen,
    containerRef,
    openMoveError,
    openMove,
    closeMove,
    dismissOpenMoveError,
    onReadyToUse
  } = useTdriveMove({ onMoved })

  const handleClose = ignoringClickaway(onClose)
  const handleErrorClose = ignoringClickaway(dismissOpenMoveError)
  const { message, duration, action } = getSavedSnackbarContent(
    file,
    moved,
    t,
    saved => void openMove(saved)
  )

  return (
    <>
      <Snackbar
        // Hidden while the user organises the file: it shows again if they
        // cancel, to let them try again
        open={file !== null && !isOpen && openMoveError === null}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <ActionAlert message={message} onClose={handleClose} action={action} />
      </Snackbar>

      <TdrivePickerDialog
        open={isOpen}
        onClose={closeMove}
        containerRef={containerRef}
        onReadyToUse={onReadyToUse}
        dismissibleWhenReady={false}
      />

      <Snackbar
        open={openMoveError !== null}
        autoHideDuration={4000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={handleErrorClose}>
          {t('tdrive.organiseError')}
        </Alert>
      </Snackbar>
    </>
  )
}
