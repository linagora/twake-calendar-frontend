/**
 * Helper functions for converting between exclusive (storage/iCal)
 * and inclusive (user-facing) all-day event dates
 */

import { CalendarEvent } from "../../../features/Events/EventsTypes";

/**
 * Convert exclusive end date to inclusive for display to users
 * Storage: "2024-01-16" to "2024-01-17" (exclusive)
 * Display: "2024-01-16" to "2024-01-16" (inclusive)
 *
 * @param endDate - The exclusive end date from storage/iCal
 * @returns The inclusive end date for user display
 */
export function exclusiveToInclusiveDate(endDate: string): string {
  const date = new Date(endDate);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Convert inclusive end date to exclusive for storage/iCal
 * Display: "2024-01-16" to "2024-01-16" (inclusive)
 * Storage: "2024-01-16" to "2024-01-17" (exclusive)
 *
 * @param endDate - The inclusive end date from user input
 * @returns The exclusive end date for storage/iCal
 */
export function inclusiveToExclusiveDate(endDate: string): string {
  const date = new Date(endDate);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

/**
 * Prepare event for display in form (convert exclusive to inclusive)
 * Use this when loading an event into the edit form
 *
 * Example usage in EventUpdateModal initialization:
 *
 * if (isAllDay) {
 *   const startDate = new Date(event.start);
 *   setStart(startDate.toISOString().split('T')[0]);
 *
 *   const endDate = new Date(event.end);
 *   // Convert exclusive to inclusive by subtracting 1 day
 *   endDate.setDate(endDate.getDate() - 1);
 *   setEnd(endDate.toISOString().split('T')[0]);
 * }
 */
export function prepareEventForDisplay(event: CalendarEvent): CalendarEvent {
  if (event.allday && event.end) {
    return {
      ...event,
      end: exclusiveToInclusiveDate(event.end),
    };
  }
  return event;
}

/**
 * Prepare event for saving (convert inclusive to exclusive)
 * Use this when saving form data back to storage
 */
export function prepareEventForSave(event: CalendarEvent): CalendarEvent {
  if (event.allday && event.end) {
    return {
      ...event,
      end: inclusiveToExclusiveDate(event.end),
    };
  }
  return event;
}
