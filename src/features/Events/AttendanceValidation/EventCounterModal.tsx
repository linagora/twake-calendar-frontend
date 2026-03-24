import { formatEventChipTitle } from "@/components/Calendar/utils/calendarUtils";
import { ResponsiveDialog } from "@/components/Dialog";
import { DateTimeFields } from "@/components/Event/components/DateTimeFields";
import { FieldWithLabel } from "@/components/Event/components/FieldWithLabel";
import { splitDateTime } from "@/components/Event/utils/dateTimeHelpers";
import { Box, Button, TextField, Typography } from "@linagora/twake-mui";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allday = contextualizedEvent.event.allday ?? false;

  const timezone = contextualizedEvent.event.timezone;

  const startSplit = splitDateTime(
    moment
      .tz(contextualizedEvent.event.start, timezone)
      .format("YYYY-MM-DDTHH:mm")
  );
  const endSplit = splitDateTime(
    moment
      .tz(
        contextualizedEvent.event.end ?? contextualizedEvent.event.start,
        timezone
      )
      .format("YYYY-MM-DDTHH:mm")
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
      setValidation({
        errors: { dateTime: t("event.validation.startRequired") },
      });
      return false;
    }
    if (!allday && (!startTime || !endTime)) {
      setValidation({
        errors: { dateTime: t("event.validation.startRequired") },
      });
      return false;
    }
    if (
      endDate < startDate ||
      (!allday && endDate === startDate && endTime <= startTime)
    ) {
      setValidation({
        errors: { dateTime: t("event.validation.endAfterStart") },
      });
      return false;
    }
    setValidation({ errors: { dateTime: "" } });
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (
      !contextualizedEvent.currentUserAttendee?.cal_address ||
      !contextualizedEvent.event.organizer?.cal_address
    ) {
      setValidation({ errors: { dateTime: t("error.unknown") } });
      return;
    }
    setIsSubmitting(true);
    try {
      await postCounterProposal({
        event: contextualizedEvent.event,
        senderEmail: contextualizedEvent.currentUserAttendee.cal_address,
        recipientEmail: contextualizedEvent.event.organizer.cal_address,
        proposedStart: contextualizedEvent.event.allday
          ? startDate
          : `${startDate}T${startTime}`,
        proposedEnd: contextualizedEvent.event.allday
          ? endDate
          : `${endDate}T${endTime}`,
        message,
      });
      setOpen(false);
    } catch (error) {
      console.error(error);
      setValidation({ errors: { dateTime: t("error.unknown") } });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setStartDate(startSplit.date);
    setStartTime(startSplit.time);
    setEndDate(endSplit.date);
    setEndTime(endSplit.time);
    setShowMore(false);
    setHasEndDateChanged(false);
    setMessage("");
    setValidation({ errors: { dateTime: "" } });
  }, [open, startSplit.date, startSplit.time, endSplit.date, endSplit.time]);

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

      <EventTimeSubtitle
        event={contextualizedEvent.event}
        t={t}
        timezone={contextualizedEvent.event.timezone}
      />

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
          size="small"
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
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {t("eventPreview.sendProposal")}
        </Button>
      </Box>
    </ResponsiveDialog>
  );
}
