import { CircularProgress, Tooltip } from "@linagora/twake-mui";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
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

  if (status === "contact") {
    return null;
  }

  if (status === "free") {
    return (
      <CheckCircleOutlineIcon
        aria-label={t("event.freeBusy.free")}
        sx={{ fontSize: size, color: "text.secondary" }}
      />
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

  // unknown
  return (
    <Tooltip title={t("event.freeBusy.unknown")} arrow>
      <HelpOutlineIcon
        aria-label={t("event.freeBusy.unknown")}
        sx={{ fontSize: size, color: "text.secondary" }}
      />
    </Tooltip>
  );
}
