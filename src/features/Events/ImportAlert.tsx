import { useAppSelector } from "@/app/hooks";
import { EventErrorSnackbar } from "@/components/Error/ErrorSnackbar";
import { useMemo, useState } from "react";

export default function ImportAlert() {
  const calendars = useAppSelector((state) => state.calendars.list);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(
    new Set()
  );

  // Collect all errors from all events in all calendars
  const errors = useMemo(() => {
    const errorList: { id: string; message: string }[] = [];
    Object.values(calendars || {}).forEach((calendar) => {
      if (calendar.events) {
        Object.values(calendar.events).forEach((event) => {
          if (event.error) {
            errorList.push({
              id: event.uid,
              message: event.error,
            });
          }
        });
      }
    });
    return errorList;
  }, [calendars]);

  // Filter out dismissed errors
  const activeErrors = useMemo(() => {
    return errors.filter((e) => !dismissedErrors.has(e.id));
  }, [errors, dismissedErrors]);

  const messages = activeErrors.map((e) => e.message);

  const handleClose = () => {
    // Mark all currently active errors as dismissed
    setDismissedErrors((prev) => {
      const next = new Set(prev);
      activeErrors.forEach((e) => next.add(e.id));
      return next;
    });
  };

  // If new errors appear that were previously dismissed (e.g. re-fetch),
  // we might want to un-dismiss them, but for now simple dismissal is enough.
  // Actually, if the error persists in the store, it's the same error.
  // If the user fixes it and it comes back, it might be a new fetch.
  // But usually uid is stable.

  if (messages.length === 0) {
    return null;
  }

  return <EventErrorSnackbar messages={messages} onClose={handleClose} />;
}
