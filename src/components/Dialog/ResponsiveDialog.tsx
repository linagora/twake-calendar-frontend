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
  Stack,
  SxProps,
  Theme,
} from "@linagora/twake-mui";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import React, { ReactNode } from "react";

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
  "maxWidth" | "title"
> {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback fired when the dialog should be closed */
  onClose: () => void;
  /** Dialog title - can be string or custom ReactNode */
  title: string | ReactNode;
  /** Dialog content - form fields, text, etc. */
  children: ReactNode;
  /** Optional actions rendered in DialogActions (buttons, etc.) */
  actions?: ReactNode;
  /** Toggle between normal and expanded (fullscreen) mode */
  isExpanded?: boolean;
  /** Callback when expand/collapse button is clicked (required if using isExpanded) */
  onExpandToggle?: () => void;
  /** Max width in normal mode (default: "570px") */
  normalMaxWidth?: string;
  /** Max width of content container in expanded mode (default: "990px") */
  expandedContentMaxWidth?: string;
  /** Height of app header to preserve visibility (default: "90px") */
  headerHeight?: string;
  /** Spacing between children in normal mode (default: 2 = 16px) */
  normalSpacing?: number;
  /** Spacing between children in expanded mode (default: 2 = 16px) */
  expandedSpacing?: number;
  /** Custom styles for DialogContent - merged with base styles */
  contentSx?: SxProps<Theme>;
  /** Custom styles for DialogTitle */
  titleSx?: SxProps<Theme>;
  /** Additional props for DialogContent (excluding sx) */
  dialogContentProps?: Omit<DialogContentProps, "sx">;
  /** Additional props for DialogTitle (excluding sx) */
  dialogTitleProps?: Omit<DialogTitleProps, "sx">;
  /** Whether to display dividers between title/content/actions */
  dividers?: boolean;
  /** Whether to show header action icons (expand/close) in normal mode (default: true) */
  showHeaderActions?: boolean;
  /** Whether to add border-top to DialogActions */
  actionsBorderTop?: boolean;
  /** Justify content alignment for DialogActions */
  actionsJustifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between";
}

function ResponsiveDialog({
  open,
  onClose,
  title,
  children,
  actions,
  isExpanded = false,
  onExpandToggle,
  normalMaxWidth = "570px",
  expandedContentMaxWidth = "990px",
  headerHeight = "90px",
  normalSpacing = 2,
  expandedSpacing = 2,
  contentSx,
  titleSx,
  dialogContentProps,
  dialogTitleProps,
  dividers = false,
  showHeaderActions = true,
  actionsBorderTop = false,
  actionsJustifyContent = "flex-end",
  sx,
  ...otherDialogProps
}: ResponsiveDialogProps) {
  const baseSx: SxProps<Theme> = {
    "& .MuiBackdrop-root": {
      opacity: isExpanded ? "0 !important" : undefined,
      transition: isExpanded ? "none !important" : undefined,
      pointerEvents: isExpanded ? "none" : undefined,
    },
    "& .MuiDialog-paper": {
      maxWidth: isExpanded ? "100%" : normalMaxWidth,
      width: "100%",
      height: isExpanded ? `calc(100vh - ${headerHeight})` : undefined,
      margin: isExpanded ? `${headerHeight} 0 0 0` : "32px",
      boxShadow: isExpanded ? "none !important" : undefined,
      transition: isExpanded ? "none !important" : undefined,
      zIndex: isExpanded ? 1200 : 1300,
    },
    "& .MuiDialogActions-root .MuiBox-root": {
      maxWidth: isExpanded ? expandedContentMaxWidth : undefined,
      margin: isExpanded ? "0 auto" : undefined,
      padding: "0",
      width: isExpanded ? "100%" : undefined,
      justifyContent: isExpanded ? "flex-end" : undefined,
    },
  };

  const baseContentSx: SxProps<Theme> = {
    width: "100%",
  };

  const contentWrapperSx: SxProps<Theme> = {
    maxWidth: isExpanded ? expandedContentMaxWidth : "100%",
    margin: isExpanded ? "0 auto" : "0",
    width: "100%",
  };

  React.useEffect(() => {
    if (isExpanded) {
      document.body.classList.add("fullscreen-view");
    } else {
      document.body.classList.remove("fullscreen-view");
    }
  }, [isExpanded]);

  const handleClose = (
    event: {},
    reason: "backdropClick" | "escapeKeyDown"
  ) => {
    if (isExpanded && reason === "backdropClick") {
      return;
    }
    onClose();
  };

  const currentSpacing = isExpanded ? expandedSpacing : normalSpacing;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      transitionDuration={isExpanded ? 0 : 300}
      sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])]}
      style={isExpanded ? { zIndex: 1200 } : undefined}
      {...otherDialogProps}
    >
      <DialogTitle sx={titleSx} {...dialogTitleProps}>
        {isExpanded && onExpandToggle ? (
          <IconButton
            onClick={onExpandToggle}
            aria-label="show less"
            sx={{ marginLeft: "-8px" }}
          >
            <ArrowBackIcon />
          </IconButton>
        ) : showHeaderActions ? (
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Box>{title}</Box>
            <Box>
              {onExpandToggle && (
                <IconButton
                  onClick={onExpandToggle}
                  aria-label="expand"
                  size="small"
                  sx={{ marginRight: 1 }}
                >
                  <OpenInFullIcon sx={{ padding: "2px" }} />
                </IconButton>
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
        sx={[
          baseContentSx,
          ...(Array.isArray(contentSx) ? contentSx : [contentSx]),
        ]}
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
              ? (theme) => `1px solid ${theme.palette.divider}`
              : undefined,
            justifyContent: actionsJustifyContent,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

export default ResponsiveDialog;
