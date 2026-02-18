import { CalendarEvent } from "@/features/Events/EventsTypes";

export function isEventOrganiser(
  event: CalendarEvent,
  effectiveEmail: string | undefined
): boolean {
  if (!event.organizer) return true; // no organizer = assume owner
  return (
    event.organizer.cal_address?.toLowerCase() === effectiveEmail?.toLowerCase()
  );
}
