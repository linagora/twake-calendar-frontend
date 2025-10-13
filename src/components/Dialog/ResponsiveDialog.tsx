import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentProps,
  DialogTitle,
  DialogTitleProps,
  DialogProps,
  IconButton,
  Stack,
  SxProps,
  Theme,
  Box,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import React, { ReactNode } from "react";

/**
 * ResponsiveDialog - A reusable dialog component that can switch between normal and expanded modes
 *
 * Features:
 * - Normal mode: Dialog with customizable max-width (default 685px)
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
interface ResponsiveDialogProps
  extends Omit<DialogProps, "maxWidth" | "title"> {
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
  /** Max width in normal mode (default: "685px") */
  normalMaxWidth?: string;
  /** Max width of content container in expanded mode (default: "990px") */
  expandedContentMaxWidth?: string;
  /** Height of app header to preserve visibility (default: "90px") */
  headerHeight?: string;
  /** Spacing between children in normal mode (default: 2 = 16px) */
  normalSpacing?: number;
  /** Spacing between children in expanded mode (default: 3 = 24px) */
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
}

function ResponsiveDialog({
  open,
  onClose,
  title,
  children,
  actions,
  isExpanded = false,
  onExpandToggle,
  normalMaxWidth = "685px",
  expandedContentMaxWidth = "990px",
  headerHeight = "90px",
  normalSpacing = 2,
  expandedSpacing = 3,
  contentSx,
  titleSx,
  dialogContentProps,
  dialogTitleProps,
  dividers = false,
  showHeaderActions = true,
  sx,
  ...otherDialogProps
}: ResponsiveDialogProps) {
  const baseSx: SxProps<Theme> = {
    "& .MuiBackdrop-root": {
      opacity: isExpanded ? "0 !important" : undefined,
      transition: isExpanded ? "none !important" : undefined,
    },
    "& .MuiDialog-paper": {
      maxWidth: isExpanded ? "100%" : normalMaxWidth,
      width: "100%",
      height: isExpanded ? `calc(100vh - ${headerHeight})` : undefined,
      margin: isExpanded ? `${headerHeight} 0 0 0` : "32px",
      boxShadow: isExpanded ? "none !important" : undefined,
      transition: isExpanded ? "none !important" : undefined,
    },
    "& .MuiDialogActions-root .MuiBox-root": {
      maxWidth: isExpanded ? expandedContentMaxWidth : undefined,
      margin: isExpanded ? "0 auto" : undefined,
      padding: isExpanded ? "0 12px" : undefined,
      width: isExpanded ? "100%" : undefined,
      justifyContent: isExpanded ? "flex-end" : undefined,
    },
  };

  const baseContentSx: SxProps<Theme> = {
    width: "100%",
    padding: isExpanded ? "16px" : undefined,
  };

  const contentWrapperSx: SxProps<Theme> = {
    maxWidth: isExpanded ? expandedContentMaxWidth : "100%",
    margin: isExpanded ? "0 auto" : "0",
    width: "100%",
  };

  const currentSpacing = isExpanded ? expandedSpacing : normalSpacing;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      transitionDuration={isExpanded ? 0 : 300}
      sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])]}
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
                >
                  <OpenInFullIcon />
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
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}

export default ResponsiveDialog;
