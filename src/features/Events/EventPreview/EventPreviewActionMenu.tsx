import EventDuplication from "@/components/Event/EventDuplicate";
import { Menu, MenuItem } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";
import { CalendarEvent } from "../EventsTypes";

interface EventPreviewActionMenuProps {
  anchorEl: Element | null;
  event: CalendarEvent;
  userEmail: string;
  isOwn: boolean;
  isWriteDelegated: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function EventPreviewActionMenu({
  anchorEl,
  event,
  userEmail,
  isOwn,
  isWriteDelegated,
  onClose,
  onDuplicate,
  onDelete,
}: EventPreviewActionMenuProps) {
  const { t } = useI18n();
  const mailSpaUrl = window.MAIL_SPA_URL ?? null;

  const attendees = event.attendee ?? [];
  const otherAttendees = attendees.filter((a) => a.cal_address !== userEmail);

  return (
    <Menu open={Boolean(anchorEl)} onClose={onClose} anchorEl={anchorEl}>
      {mailSpaUrl && otherAttendees.length > 0 && (
        <MenuItem
          onClick={() =>
            window.open(
              `${mailSpaUrl}/mailto/?uri=mailto:${otherAttendees
                .map((a) => a.cal_address)
                .join(",")}&subject=${encodeURIComponent(event.title ?? "")}`
            )
          }
        >
          {t("eventPreview.emailAttendees")}
        </MenuItem>
      )}
      <EventDuplication
        onOpenDuplicate={() => {
          onClose();
          onDuplicate();
        }}
      />
      {(isOwn || isWriteDelegated) && (
        <MenuItem onClick={onDelete}>{t("eventPreview.deleteEvent")}</MenuItem>
      )}
    </Menu>
  );
}
