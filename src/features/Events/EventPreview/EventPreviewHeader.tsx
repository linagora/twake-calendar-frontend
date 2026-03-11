import { dlEvent } from "../EventApi";
import { CalendarEvent } from "../EventsTypes";
import { Box, IconButton } from "@linagora/twake-mui";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";

interface EventPreviewHeaderProps {
  event: CalendarEvent;
  eventId: string;
  isOrganizer: boolean;
  isOwn: boolean;
  isWriteDelegated: boolean;
  isNotPrivate: boolean;
  isRecurring: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMoreClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export function EventPreviewHeader({
  event,
  eventId,
  isOrganizer,
  isOwn,
  isWriteDelegated,
  isNotPrivate,
  isRecurring,
  onClose,
  onEdit,
  onMoreClick,
}: EventPreviewHeaderProps) {
  const canEdit = isOrganizer && (isOwn || (isWriteDelegated && isNotPrivate));
  const canSeeMore = (isNotPrivate && !isOwn) || isOwn;

  return (
    <Box
      display="flex"
      justifyContent="flex-end"
      alignItems="center"
      gap={0.5}
      width="100%"
    >
      {window.DEBUG && (
        <IconButton
          size="small"
          onClick={async () => {
            let url: string | null = null;
            try {
              const icsContent = await dlEvent(event);
              const blob = new Blob([icsContent], { type: "text/calendar" });
              url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${eventId}.ics`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (error) {
              console.error("Failed to download ICS file:", error);
            } finally {
              if (url) URL.revokeObjectURL(url);
            }
          }}
        >
          <FileDownloadOutlinedIcon />
        </IconButton>
      )}
      {canEdit && (
        <IconButton size="small" onClick={onEdit}>
          <EditIcon />
        </IconButton>
      )}
      {canSeeMore && (
        <IconButton size="small" onClick={onMoreClick}>
          <MoreVertIcon />
        </IconButton>
      )}
      <IconButton size="small" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
  );
}
