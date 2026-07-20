import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentProps,
  DialogProps,
  DialogTitle,
  DialogTitleProps,
  IconButton,
  Paper,
  PaperProps,
  Stack,
  SxProps,
  Theme,
  useMediaQuery,
  useTheme
} from '@linagora/twake-mui'
import Tooltip from '@common/components/Tooltip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CozyBridge from 'cozy-external-bridge'
import React, { ReactNode, useMemo } from 'react'

/**
 * ResponsiveDialog - A reusable dialog component that can switch between normal and expanded modes
 *
 * Features:
 * - Normal mode: Dialog with customizable max-width (default 570px)
 * - Expanded mode: Full height dialog (excluding app header) with centered content container
 * - Fully customizable with sx props for Dialog, DialogTitle, and DialogContent
 * - Preserves app header visibility in expanded mode
 *
 * @example
 * ```tsx
 * <ResponsiveDialog
 *   open={open}
 *   onClose={handleClose}
 *   title="My Dialog"
 *   isExpanded={showMore}
 *   actions={<Button onClick={handleSave}>Save</Button>}
 *   contentSx={{ padding: 3 }}
 * >
 *   <TextField label="Name" />
 * </ResponsiveDialog>
 * ```
 */
interface ResponsiveDialogProps extends Omit<
  DialogProps,
  'maxWidth' | 'title'
> {
  /** Whether the dialog is open */
  open: boolean
  /** Callback fired when the dialog should be closed */
  onClose: () => void
  /** Dialog title - can be string or custom ReactNode */
  title: string | ReactNode
  /** Dialog content - form fields, text, etc. */
  children: ReactNode
  /** Optional actions rendered in DialogActions (buttons, etc.) */
  actions?: ReactNode
  /** Toggle between normal and expanded (fullscreen) mode */
  isExpanded?: boolean
  /** Callback when expand/collapse button is clicked (required if using isExpanded) */
  onExpandToggle?: () => void
  /** Max width in normal mode (default: "570px") */
  normalMaxWidth?: string
  /** Max width of content container in expanded mode (default: "990px") */
  expandedContentMaxWidth?: string
  /** Height of app header to preserve visibility (default: "90px") */
  headerHeight?: string
  /** Spacing between children in normal mode (default: 2 = 16px) */
  normalSpacing?: number
  /** Spacing between children in expanded mode (default: 2 = 16px) */
  expandedSpacing?: number
  /** Custom styles for DialogContent - merged with base styles */
  contentSx?: SxProps<Theme>
  /** Custom styles for DialogTitle */
  titleSx?: SxProps<Theme>
  /** Additional props for DialogContent (excluding sx) */
  dialogContentProps?: Omit<DialogContentProps, 'sx'>
  /** Additional props for DialogTitle (excluding sx) */
  dialogTitleProps?: Omit<DialogTitleProps, 'sx'>
  /** Whether to display dividers between title/content/actions */
  dividers?: boolean
  /** Whether to show header action icons (expand/close) in normal mode (default: true) */
  showHeaderActions?: boolean
  /** Whether to add border-top to DialogActions */
  actionsBorderTop?: boolean
  /** Justify content alignment for DialogActions */
  actionsJustifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between'

  expandText?: string

  draggable?: boolean
}

// Mutable box shared between DraggablePaper and ResponsiveDialog.
// - enabled: whether dragging is active right now
// - reset: called by ResponsiveDialog when isExpanded changes to true
const draggableState: {
  enabled: boolean
  reset: (() => void) | null
} = { enabled: false, reset: null }

const DraggablePaper = (props: PaperProps): JSX.Element => {
  const pos = React.useRef({ x: 0, y: 0 })
  const origin = React.useRef<{ mx: number; my: number } | null>(null)
  const el = React.useRef<HTMLDivElement>(null)

  // Register a reset function so ResponsiveDialog can clear the transform
  // when switching to expanded mode. Must be in an effect to satisfy
  React.useEffect(() => {
    draggableState.reset = (): void => {
      pos.current = { x: 0, y: 0 }
      origin.current = null
      if (el.current) el.current.style.transform = ''
    }
    return () => {
      draggableState.reset = null
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!draggableState.enabled) return
    const target = e.target as HTMLElement
    if (!target.closest('.draggable-dialog-title')) return
    if (target.closest('button')) return
    origin.current = {
      mx: e.clientX - pos.current.x,
      my: e.clientY - pos.current.y
    }
    el.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!origin.current || !el.current) return
    pos.current = {
      x: e.clientX - origin.current.mx,
      y: e.clientY - origin.current.my
    }
    el.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
  }

  const onPointerUp = (): void => {
    origin.current = null
  }

  return (
    <Paper
      {...props}
      ref={el}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

function ResponsiveDialog({
  open,
  onClose,
  title,
  children,
  actions,
  isExpanded = false,
  onExpandToggle,
  normalMaxWidth = '570px',
  expandedContentMaxWidth = '990px',
  headerHeight = '70px',
  normalSpacing = 2,
  expandedSpacing = 2,
  contentSx,
  titleSx,
  dialogContentProps,
  dialogTitleProps,
  dividers = false,
  showHeaderActions = true,
  actionsBorderTop = false,
  actionsJustifyContent = 'flex-end',
  sx,
  expandText,
  draggable = false,
  ...otherDialogProps
}: ResponsiveDialogProps): JSX.Element {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isInIframe = useMemo(() => new CozyBridge().isInIframe(), [])

  const isDraggable = draggable && !isMobile && !isExpanded

  React.useEffect(() => {
    // Sync enabled state — must be in an effect to satisfy react-hooks/immutability.
    draggableState.enabled = isDraggable
  }, [isDraggable])

  // Reset drag position when entering expanded mode so the dialog re-centres.
  React.useEffect(() => {
    if (isExpanded) draggableState.reset?.()
  }, [isExpanded])

  const baseSx: SxProps<Theme> | undefined = isMobile
    ? undefined
    : {
        '& .MuiBackdrop-root': {
          opacity: isExpanded ? '0 !important' : undefined,
          transition: isExpanded ? 'none !important' : undefined,
          pointerEvents: isExpanded ? 'none' : undefined
        },
        '& .MuiDialog-paper': {
          maxWidth: isExpanded ? '100%' : normalMaxWidth,
          width: '100%',
          height: isExpanded
            ? `calc(100vh - ${isInIframe ? '0px' : headerHeight})`
            : undefined,
          maxHeight: isExpanded && isInIframe ? '100%' : undefined,
          margin: isExpanded
            ? `${isInIframe ? 0 : headerHeight} 0 0 0`
            : '32px',
          boxShadow: isExpanded ? 'none !important' : undefined,
          transition: isExpanded ? 'none !important' : undefined,
          zIndex: isExpanded ? 1200 : 1300
        },
        '& .MuiDialogActions-root .MuiBox-root': {
          maxWidth: isExpanded ? expandedContentMaxWidth : undefined,
          margin: isExpanded ? '0 auto' : undefined,
          padding: '0',
          width: isExpanded ? '100%' : undefined,
          justifyContent: isExpanded ? 'flex-end' : undefined
        }
      }

  const baseContentSx: SxProps<Theme> = {
    width: '100%'
  }

  const contentWrapperSx: SxProps<Theme> = {
    maxWidth: isExpanded ? expandedContentMaxWidth : '100%',
    margin: isExpanded ? '0 auto' : '0',
    width: '100%'
  }

  React.useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('fullscreen-view')
    } else {
      document.body.classList.remove('fullscreen-view')
    }
  }, [isExpanded])

  const handleClose = (
    event: unknown,
    reason: 'backdropClick' | 'escapeKeyDown'
  ): void => {
    if (isExpanded && reason === 'backdropClick') {
      return
    }
    onClose()
  }

  const currentSpacing = isExpanded ? expandedSpacing : normalSpacing

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={isMobile}
      fullWidth
      transitionDuration={isExpanded ? 0 : 300}
      sx={
        [
          { '& .MuiDialog-paper': { overflowY: 'hidden' } },
          ...(baseSx ? [baseSx] : []),
          ...(Array.isArray(sx) ? (sx as SxProps<Theme>[]) : sx ? [sx] : [])
        ] as SxProps<Theme>
      }
      style={isExpanded ? { zIndex: 1200 } : undefined}
      PaperComponent={DraggablePaper}
      aria-labelledby="responsive-dialog-title"
      {...otherDialogProps}
    >
      <DialogTitle
        id="responsive-dialog-title"
        className="draggable-dialog-title"
        sx={[titleSx, isDraggable ? { cursor: 'move' } : {}] as SxProps<Theme>}
        {...dialogTitleProps}
      >
        {isExpanded && onExpandToggle && !isMobile ? (
          <IconButton
            onClick={onExpandToggle}
            aria-label="show less"
            sx={{ marginLeft: '-8px' }}
          >
            <ArrowBackIcon sx={{ fontSize: 30 }} />
          </IconButton>
        ) : showHeaderActions ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <Box>{title}</Box>
            <Box>
              {onExpandToggle && !isMobile && (
                <Tooltip title={expandText}>
                  <IconButton
                    onClick={onExpandToggle}
                    aria-label="expand"
                    size="small"
                    sx={{ marginRight: 1 }}
                  >
                    <OpenInFullIcon sx={{ padding: '2px' }} />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton onClick={onClose} aria-label="close" size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          title
        )}
      </DialogTitle>
      <DialogContent
        dividers={dividers}
        sx={
          [
            baseContentSx,
            ...(Array.isArray(contentSx)
              ? (contentSx as SxProps<Theme>[])
              : contentSx
                ? [contentSx]
                : [])
          ] as SxProps<Theme>
        }
        {...dialogContentProps}
      >
        {isExpanded ? (
          <Stack spacing={currentSpacing} sx={contentWrapperSx}>
            {children}
          </Stack>
        ) : (
          <Stack spacing={currentSpacing}>{children}</Stack>
        )}
      </DialogContent>
      {actions && (
        <DialogActions
          sx={{
            borderTop: actionsBorderTop
              ? (theme: Theme): string => `1px solid ${theme.palette.divider}`
              : undefined,
            justifyContent: actionsJustifyContent
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}

export default ResponsiveDialog
