import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "twake-mui";
import { CalendarEvent } from "../../features/Events/EventsTypes";
import { useState } from "react";
import { useI18n } from "twake-i18n";

export function EditModeDialog({
  type,
  setOpen,
  event,
  eventAction,
}: {
  type: string | null;
  setOpen: (e: string | null) => void;
  event: CalendarEvent;
  eventAction: (type: "solo" | "all" | undefined) => void;
}) {
  const { t } = useI18n();
  const [typeOfAction, setTypeOfAction] = useState<"solo" | "all" | undefined>(
    "solo"
  );
  const handleEvent = async () => {
    eventAction(typeOfAction);
    handleClose();
  };
  const handleClose = () => {
    setOpen(null);
    setTypeOfAction("solo");
  };
  return (
    <Dialog open={Boolean(type)} onClose={handleClose}>
      <DialogTitle>
        {type === "edit" && t("editModeDialog.updateRecurrentEvent")}
        {type === "attendance" && t("editModeDialog.updateParticipationStatus")}
      </DialogTitle>
      <DialogContent>
        <RadioGroup
          value={typeOfAction}
          onChange={(e) =>
            setTypeOfAction(e.target.value as "solo" | "all" | undefined)
          }
        >
          <FormControlLabel
            value="solo"
            control={<Radio />}
            label={t("editModeDialog.thisEvent")}
          />
          <FormControlLabel
            value="all"
            control={<Radio />}
            label={t("editModeDialog.allEvents")}
          />
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <ButtonGroup>
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
          <Button onClick={handleEvent}>{t("common.ok")}</Button>
        </ButtonGroup>
      </DialogActions>
    </Dialog>
  );
}
