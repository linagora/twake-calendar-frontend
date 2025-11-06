import { MenuItem } from "@mui/material";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

export default function EventDuplication({
  onClose,
  event,
  onOpenDuplicate,
}: {
  onClose: Function;
  event: CalendarEvent;
  onOpenDuplicate?: () => void;
}) {
  const { t } = useI18n();
  return (
    <MenuItem
      onClick={() => {
        onOpenDuplicate?.();
      }}
    >
      {t("eventDuplication.duplicateEvent")}
    </MenuItem>
  );
}
