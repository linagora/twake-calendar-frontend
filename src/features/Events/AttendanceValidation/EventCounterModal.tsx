import { formatEventChipTitle } from "@/components/Calendar/utils/calendarUtils";
import { ResponsiveDialog } from "@/components/Dialog";
import { DateTimeFields } from "@/components/Event/components/DateTimeFields";
import { FieldWithLabel } from "@/components/Event/components/FieldWithLabel";
import { splitDateTime } from "@/components/Event/utils/dateTimeHelpers";
import { Box, Button, TextField, Typography } from "@linagora/twake-mui";
import { useState } from "react";
import { useI18n } from "twake-i18n";
import { postCounterProposal } from "../api/sendCounterProposal";
import { EventTimeSubtitle } from "../EventPreview/EventTimeSubtitle";
import { ContextualizedEvent } from "../EventsTypes";

export function EventCounterModal({
  open,
  setOpen,
  contextualizedEvent,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  contextualizedEvent: ContextualizedEvent;
}) {
  const { t } = useI18n();

  const allday = contextualizedEvent.event.allday ?? false;

  const startSplit = splitDateTime(contextualizedEvent.event.start);
  const endSplit = splitDateTime(
    contextualizedEvent.event.end ?? contextualizedEvent.event.start
  );

  const [startDate, setStartDate] = useState(startSplit.date);
  const [startTime, setStartTime] = useState(startSplit.time);
  const [endDate, setEndDate] = useState(endSplit.date);
  const [endTime, setEndTime] = useState(endSplit.time);
  const [showMore, setShowMore] = useState(false);
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<{
    errors: { dateTime: string };
  }>({
    errors: { dateTime: "" },
  });

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value > endDate) {
      setEndDate(value);
      setHasEndDateChanged(true);
    }
    setValidation({ errors: { dateTime: "" } });
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setValidation({ errors: { dateTime: "" } });
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setHasEndDateChanged(true);
    setValidation({ errors: { dateTime: "" } });
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setValidation({ errors: { dateTime: "" } });
  };

  const validate = (): boolean => {
    if (!startDate || !endDate) {
      setValidation({ errors: { dateTime: t("validation.required") } });
      return false;
    }
    if (!allday && (!startTime || !endTime)) {
      setValidation({ errors: { dateTime: t("validation.required") } });
      return false;
    }
    if (
      endDate < startDate ||
      (!allday && endDate === startDate && endTime <= startTime)
    ) {
      setValidation({ errors: { dateTime: t("validation.endBeforeStart") } });
      return false;
    }
    setValidation({ errors: { dateTime: "" } });
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await postCounterProposal(
      contextualizedEvent.event,
      contextualizedEvent.currentUserAttendee?.cal_address,
      contextualizedEvent.event.organizer?.cal_address,
      startTime,
      endTime,
      message
    );
    setOpen(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={() => setOpen(false)}
      title={t("eventPreview.proposeNewTime")}
    >
      {/* Event title */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography
          variant="h3"
          sx={{
            wordBreak: "break-word",
          }}
        >
          {formatEventChipTitle(contextualizedEvent.event, t)}
        </Typography>
      </Box>

      {/* Current event time */}
      <FieldWithLabel
        label={t("eventPreview.currentEventTime")}
        isExpanded={false}
      >
        <EventTimeSubtitle
          event={contextualizedEvent.event}
          t={t}
          timezone={contextualizedEvent.event.timezone}
        />
      </FieldWithLabel>

      {/* Your proposal label */}
      <FieldWithLabel label={t("eventPreview.yourProposal")} isExpanded={false}>
        <DateTimeFields
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          endTime={endTime}
          allday={allday}
          showMore={showMore}
          hasEndDateChanged={hasEndDateChanged}
          validation={validation}
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndDateChange={handleEndDateChange}
          onEndTimeChange={handleEndTimeChange}
          showEndDate={
            showMore ||
            allday ||
            (hasEndDateChanged && startDate !== endDate) ||
            (!showMore && !allday && startDate !== endDate)
          }
          onToggleEndDate={() => setShowMore((prev) => !prev)}
        />
      </FieldWithLabel>
      {/* Optional message */}
      <Box mt={2}>
        <TextField
          margin="dense"
          multiline
          minRows={2}
          maxRows={10}
          fullWidth
          placeholder={t("eventPreview.optionalMessage")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{
            mt: 2,
            "& .MuiInputBase-root": {
              overflowY: "auto",
              padding: 0,
            },
            "& textarea": {
              resize: "vertical",
            },
          }}
        />
      </Box>

      {/* Actions */}
      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button variant="text" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {t("eventPreview.sendProposal")}
        </Button>
      </Box>
    </ResponsiveDialog>
  );
}
