import { Box, Typography } from '@linagora/twake-mui'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

interface FilesHandler {
  onFilesDropped: (files: File[]) => void
  /** What the overlay says while files are dragged */
  label: string
}
type RegisterFilesHandler = (handler: FilesHandler) => () => void

const DialogFileDropContext = createContext<RegisterFilesHandler | null>(null)

export const DialogFileDropProvider = DialogFileDropContext.Provider

const hasFiles = (event: DragEvent | React.DragEvent): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

/**
 * Takes the files dropped on the body of the dialog around, for as long as
 * the caller is mounted. Without a handler, the dialog takes no files.
 */
export function useDialogFileDrop(
  onFilesDropped: FilesHandler['onFilesDropped'] | undefined,
  label: string
): void {
  const register = useContext(DialogFileDropContext)
  useEffect(() => {
    if (!onFilesDropped) return
    return register?.({ onFilesDropped, label })
  }, [register, onFilesDropped, label])
}

interface DropArea {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Marks what stays out of the drop zone, at the top of the dialog body: the
 * zone starts with what comes after it (under the event title).
 */
export const FILE_DROP_START_AFTER = { 'data-file-drop-start-after': true }

/**
 * Where the fields of the body are in the dialog, without what is marked to
 * stay above the zone, and only what is visible of them however the body is
 * scrolled.
 */
function measureDropArea(content: HTMLElement): DropArea | null {
  const paper = content.closest<HTMLElement>('.MuiDialog-paper')
  // The column of fields, narrower than the body in expanded mode
  const fields = content.firstElementChild
  if (!paper || !fields) return null

  const paperRect = paper.getBoundingClientRect()
  const contentRect = content.getBoundingClientRect()
  const fieldsRect = fields.getBoundingClientRect()
  const { paddingTop, paddingBottom } = getComputedStyle(content)

  const startAfter = content.querySelector('[data-file-drop-start-after]')
  const fieldsTop = startAfter
    ? (startAfter.nextElementSibling ?? startAfter).getBoundingClientRect()[
        startAfter.nextElementSibling ? 'top' : 'bottom'
      ]
    : fieldsRect.top
  const top = Math.max(
    contentRect.top + parseFloat(paddingTop || '0'),
    fieldsTop
  )
  const bottom = Math.min(
    contentRect.bottom - parseFloat(paddingBottom || '0'),
    fieldsRect.bottom
  )

  return {
    top: top - paperRect.top,
    left: fieldsRect.left - paperRect.left,
    width: fieldsRect.width,
    height: Math.max(0, bottom - top)
  }
}

interface DialogFileDropArea {
  register: RegisterFilesHandler
  contentHandlers: Pick<
    React.HTMLAttributes<HTMLElement>,
    'onDragOver' | 'onDrop'
  >
  overlay: React.ReactNode
}

/**
 * Makes the body of a dialog a drop zone, once something in it takes the
 * files with useDialogFileDrop. The zone shows up as soon as files are
 * dragged over the app. Text or links dragged around are left alone.
 */
export function useDialogFileDropArea({
  open,
  contentRef
}: {
  open: boolean
  contentRef: React.RefObject<HTMLElement | null>
}): DialogFileDropArea {
  const [handler, setHandler] = useState<FilesHandler | null>(null)
  // Measured when the files come in
  const [area, setArea] = useState<DropArea | null>(null)

  const register = useCallback<RegisterFilesHandler>(next => {
    setHandler(next)
    return (): void =>
      setHandler(current => (current === next ? null : current))
  }, [])

  const isActive = open && handler !== null

  useEffect(() => {
    if (!isActive) return
    // dragenter and dragleave fire on every element crossed: count them to
    // know when the files leave the window
    let depth = 0

    const reset = (): void => {
      depth = 0
      setArea(null)
    }
    const handleDragEnter = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      depth += 1
      const content = contentRef.current
      if (depth === 1 && content) setArea(measureDropArea(content))
    }
    const handleDragLeave = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) reset()
    }
    // The body has already taken the event when it gets here
    const handleDragOver = (event: DragEvent): void => {
      if (!hasFiles(event) || event.defaultPrevented) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
    }
    // A file dropped out of the body is ignored, instead of the browser
    // leaving the app to open it
    const handleDrop = (event: DragEvent): void => {
      if (hasFiles(event) && !event.defaultPrevented) event.preventDefault()
      reset()
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return (): void => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
      reset()
    }
  }, [isActive, contentRef])

  const contentHandlers: DialogFileDropArea['contentHandlers'] = isActive
    ? {
        onDragOver: event => {
          if (!hasFiles(event)) return
          // Without it the browser opens the dropped file instead
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        },
        onDrop: event => {
          if (!hasFiles(event)) return
          event.preventDefault()
          const files = Array.from(event.dataTransfer.files)
          if (files.length) handler?.onFilesDropped(files)
        }
      }
    : {}

  const overlay = isActive && handler && area && (
    <DropOverlay area={area} label={handler.label} />
  )

  return { register, contentHandlers, overlay }
}

const DropOverlay: React.FC<{ area: DropArea; label: string }> = ({
  area,
  label
}) => (
  <Box
    data-testid="dialog-file-drop-overlay"
    sx={{
      position: 'absolute',
      top: area.top,
      left: area.left,
      width: area.width,
      height: area.height,
      zIndex: 1,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px dashed',
      borderColor: 'var(--twake-palette-divider)',
      borderRadius: '6px',
      // The fields show through, faded
      bgcolor:
        'color-mix(in srgb, var(--twake-palette-background-paper) 80%, transparent)',
      // The overlay must not take the drag events from the body
      pointerEvents: 'none'
    }}
  >
    <Box
      sx={{
        width: 96,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1
      }}
    >
      <Box
        sx={{
          display: 'flex',
          p: '14px',
          borderRadius: '999px',
          bgcolor: 'var(--twake-palette-text-icon)',
          color: 'var(--twake-palette-background-paper)'
        }}
      >
        <CloudUploadOutlinedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'var(--twake-palette-text-primary)',
          textAlign: 'center',
          wordBreak: 'break-word'
        }}
      >
        {label}
      </Typography>
    </Box>
  </Box>
)
