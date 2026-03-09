import { CircularProgress, Tooltip } from "@linagora/twake-mui";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useI18n } from "twake-i18n";
import { FreeBusyStatus } from "./useFreeBusy";

interface FreeBusyIndicatorProps {
  status: FreeBusyStatus;
  size?: number;
}

export function FreeBusyIndicator({
  status,
  size = 16,
}: FreeBusyIndicatorProps) {
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <Tooltip title={t("event.freeBusy.loading")} arrow>
        <CircularProgress size={size} thickness={5} />
      </Tooltip>
    );
  }

  if (status === "busy") {
    return (
      <Tooltip title={t("event.freeBusy.busy")} arrow>
        <RemoveCircleOutlineIcon
          aria-label={t("event.freeBusy.busy")}
          sx={{ fontSize: size, color: "text.secondary" }}
        />
      </Tooltip>
    );
  }

  return null;
}
