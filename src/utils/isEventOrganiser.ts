import { CalendarEvent } from "@/features/Events/EventsTypes";

export function isEventOrganiser(
  event: CalendarEvent,
  effectiveEmail: string | undefined
): boolean {
  if (!event.organizer) return true; // no organizer = assume owner
  const organizerEmail = event.organizer.cal_address?.toLowerCase();
  if (!organizerEmail || !effectiveEmail) return false;
  return organizerEmail === effectiveEmail.toLowerCase();
}
