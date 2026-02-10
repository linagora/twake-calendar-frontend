import { MenuItem } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";

export default function EventDuplication({
  onOpenDuplicate,
}: {
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
