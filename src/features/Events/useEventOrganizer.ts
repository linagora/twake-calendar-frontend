import { makeDisplayName } from "@/utils/makeDisplayName";
import { useMemo } from "react";
import { Calendar } from "../Calendars/CalendarTypes";

// Update event organizer accordingly to selected calendar's delegated status
export function useEventOrganizer({
  calendarid,
  calList,
  userOrganizer,
}: {
  calendarid: string;
  calList: Record<string, Calendar>;
  userOrganizer?: { cn: string; cal_address: string };
}) {
  const selectedCalendar = useMemo(
    () => calList?.[calendarid],
    [calList, calendarid]
  );

  const organizer = useMemo(() => {
    if (selectedCalendar?.delegated && selectedCalendar?.owner) {
      return {
        cn:
          makeDisplayName(selectedCalendar) ??
          selectedCalendar.owner.emails?.[0] ??
          "",
        cal_address: selectedCalendar.owner.emails?.[0] ?? "",
      };
    }
    return userOrganizer;
  }, [selectedCalendar, userOrganizer]);

  return { organizer, selectedCalendar };
}
