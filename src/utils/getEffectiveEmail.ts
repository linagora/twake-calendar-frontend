import { Calendar } from "@/features/Calendars/CalendarTypes";

export function getEffectiveEmail(
  calendar: Calendar | undefined,
  isWriteDelegated: boolean,
  userAddress: string | undefined
): string | undefined {
  return isWriteDelegated ? calendar?.owner?.emails?.[0] : userAddress;
}
