import { CalendarEvent } from "@/features/Events/EventsTypes";
import { MenuItem } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";

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
