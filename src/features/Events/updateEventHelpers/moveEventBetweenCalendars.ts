import { AppDispatch } from "@/app/store";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  deleteEventAsync,
  moveEventAsync,
  putEventAsync,
} from "@/features/Calendars/services";
import { AsyncThunkResult } from "@/features/Calendars/types/AsyncThunkResult";
import { userAttendee } from "@/features/User/models/attendee";
import { userOrganiser } from "@/features/User/userDataTypes";
import { assertThunkSuccess } from "@/utils/assertThunkSuccess";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { makeDisplayName } from "@/utils/makeDisplayName";
import { CalendarEvent } from "../EventsTypes";
import { buildDelegatedEventURL } from "../eventUtils";

export interface MoveEventBetweenCalendarsParams {
  dispatch: AppDispatch;
  calList: Record<string, Calendar>;
  newEvent: CalendarEvent;
  oldCalId: string;
  newCalId: string;
}

/**
 * Derives the organizer for the event in its new calendar.
 *
 * When moving into (or out of) a delegated calendar, the organizer must
 * become the owner of the target calendar rather than the original organizer.
 */
function resolveOrganizerForCalendar(
  calendar: Calendar,
  originalOrganizer: CalendarEvent["organizer"]
): CalendarEvent["organizer"] {
  const ownerEmail = calendar.owner?.emails?.[0];
  if (!ownerEmail) {
    return originalOrganizer;
  }

  return {
    ...originalOrganizer,
    cal_address: ownerEmail,
    cn: makeDisplayName(calendar) ?? originalOrganizer?.cn ?? "",
  };
}

/**
 * Rewrites the attendee list so that:
 *  - The old organizer is removed (they were implicitly the organizer, not an attendee).
 *  - The new organizer is added as a CHAIR attendee if not already present.
 *
 * This keeps the attendee list consistent after an organizer change caused by a
 * delegated-calendar move.
 */
function rewriteAttendeesForOrganizerChange(
  attendees: userAttendee[],
  oldOrganizer?: userOrganiser,
  newOrganizer?: userOrganiser
): userAttendee[] {
  if (!newOrganizer) {
    return attendees;
  }
  const normalise = (addr: string | undefined) => (addr ?? "").toLowerCase();
  const oldAddr = normalise(oldOrganizer?.cal_address);
  const newAddr = normalise(newOrganizer.cal_address);

  // Remove the old organizer from the attendee list.
  const filtered = attendees.filter(
    (a) => normalise(a.cal_address) !== oldAddr
  );

  // Add the new organizer as CHAIR if they are not already listed.
  const alreadyPresent = filtered.some(
    (a) => normalise(a.cal_address) === newAddr
  );

  if (!alreadyPresent && newAddr) {
    filtered.push({
      cal_address: newOrganizer.cal_address,
      partstat: "ACCEPTED",
      role: "CHAIR",
      rsvp: "FALSE",
      cn: newOrganizer.cn || newOrganizer.cal_address,
      cutype: "INDIVIDUAL",
    });
  }

  return filtered;
}

/**
 * Moves an event from one calendar to another.
 *
 * Two strategies are used depending on whether either calendar is delegated:
 *
 * Standard move (neither calendar is delegated):
 *  1. MOVE the event to the new calendar via the dedicated move endpoint.
 *
 * Delegated move (at least one calendar is delegated):
 *  The organizer and attendees must change to reflect the new calendar's owner,
 *  so a server-side MOVE is not safe. Instead:
 *  1. Build a new event with the updated organizer and attendee list.
 *  2. DELETE the event from the old calendar.
 *  3. PUT the new event directly into the target calendar.
 *
 * Throws if either calendar is missing or any API call fails.
 */
export async function moveEventBetweenCalendars({
  dispatch,
  calList,
  newEvent,
  oldCalId,
  newCalId,
}: MoveEventBetweenCalendarsParams): Promise<void> {
  const oldCalendar = calList[oldCalId];
  if (!oldCalendar) {
    throw new Error(`Old calendar not found: ${oldCalId}`);
  }

  const targetCalendar = calList[newCalId];
  if (!targetCalendar) {
    throw new Error(`Target calendar not found: ${newCalId}`);
  }

  const isDelegatedMove = oldCalendar.delegated || targetCalendar.delegated;

  if (isDelegatedMove) {
    await moveDelegatedEvent({
      dispatch,
      newEvent,
      oldCalendar,
      targetCalendar,
    });
  } else {
    await moveStandardEvent({
      dispatch,
      newEvent,
      targetCalendar,
      oldCalendar,
    });
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface StandardMoveParams {
  dispatch: AppDispatch;
  newEvent: CalendarEvent;
  targetCalendar: Calendar;
  oldCalendar: Calendar;
}

/**
 * Standard (non-delegated) move: MOVE the event to the new calendar.
 */
async function moveStandardEvent({
  dispatch,
  newEvent,
  targetCalendar,
  oldCalendar,
}: StandardMoveParams): Promise<void> {
  const newCalId = targetCalendar.id;

  // Step 1: Update the event in the old calendar so the server has the
  // latest data before we issue the move request.
  const putResult = await dispatch(
    putEventAsync({
      cal: oldCalendar,
      newEvent: { ...newEvent, calId: oldCalendar.id },
    })
  );

  const typedPutResult = putResult as AsyncThunkResult;
  if (typedPutResult && typeof typedPutResult.unwrap === "function") {
    await typedPutResult.unwrap();
  } else {
    assertThunkSuccess(putResult);
  }

  // Step 2: Move the event to the target calendar.
  const newURL = `/calendars/${newCalId}/${extractEventBaseUuid(newEvent.uid)}.ics`;

  const moveResult = await dispatch(
    moveEventAsync({
      cal: targetCalendar,
      newEvent,
      newURL,
    })
  );

  const typedMoveResult = moveResult as AsyncThunkResult;
  if (typedMoveResult && typeof typedMoveResult.unwrap === "function") {
    await typedMoveResult.unwrap();
  } else {
    assertThunkSuccess(moveResult);
  }
}

interface DelegatedMoveParams {
  dispatch: AppDispatch;
  newEvent: CalendarEvent;
  oldCalendar: Calendar;
  targetCalendar: Calendar;
}

/**
 * Delegated move: resolve new organizer + attendees, DELETE old, PUT new.
 */
async function moveDelegatedEvent({
  dispatch,
  newEvent,
  oldCalendar,
  targetCalendar,
}: DelegatedMoveParams): Promise<void> {
  const newCalId = targetCalendar.id;

  // 1. Resolve the organizer for the target calendar
  const newOrganizer = resolveOrganizerForCalendar(
    targetCalendar,
    newEvent.organizer
  );

  // 2. Rewrite attendees to reflect the organizer change
  const newAttendees = rewriteAttendeesForOrganizerChange(
    newEvent.attendee ?? [],
    newEvent.organizer,
    newOrganizer
  );

  // 3. Build the event as it should exist in the target calendar
  const newURL = `/calendars/${newCalId}/${extractEventBaseUuid(newEvent.uid)}.ics`;
  const eventForTargetCalendar: CalendarEvent = {
    ...newEvent,
    calId: newCalId,
    URL: targetCalendar.delegated
      ? buildDelegatedEventURL(targetCalendar, newURL)
      : newURL,
    organizer: newOrganizer,
    attendee: newAttendees,
  };

  // 4. Delete the event from the old calendar
  const deleteResult = await dispatch(
    deleteEventAsync({
      calId: oldCalendar.id,
      eventId: newEvent.uid,
      eventURL: newEvent.URL,
    })
  );

  const typedDeleteResult = deleteResult as AsyncThunkResult;
  if (typedDeleteResult && typeof typedDeleteResult.unwrap === "function") {
    await typedDeleteResult.unwrap();
  } else {
    assertThunkSuccess(deleteResult);
  }

  // 5. PUT the updated event into the target calendar
  const putResult = await dispatch(
    putEventAsync({ cal: targetCalendar, newEvent: eventForTargetCalendar })
  );

  const typedPutResult = putResult as AsyncThunkResult;
  if (typedPutResult && typeof typedPutResult.unwrap === "function") {
    await typedPutResult.unwrap();
  } else {
    assertThunkSuccess(putResult);
  }
}
