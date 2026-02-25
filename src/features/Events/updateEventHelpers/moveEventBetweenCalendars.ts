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

  // Remove the old organizer from the attendee list if there is one
  const filtered = attendees.filter(
    (a) => normalise(a.cal_address) !== oldAddr
  );

  // Add the new organizer as CHAIR if they are not already listed
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

interface StandardMoveParams {
  dispatch: AppDispatch;
  newEvent: CalendarEvent;
  targetCalendar: Calendar;
  oldCalendar: Calendar;
}

async function moveStandardEvent({
  dispatch,
  newEvent,
  targetCalendar,
  oldCalendar,
}: StandardMoveParams): Promise<void> {
  const newCalId = targetCalendar.id;

  const putResult = await dispatch(
    putEventAsync({
      cal: oldCalendar,
      newEvent: { ...newEvent, calId: oldCalendar.id },
    })
  );
  await assertThunkSuccess(putResult);
  const newURL = `/calendars/${newCalId}/${extractEventBaseUuid(newEvent.uid)}.ics`;

  const moveResult = await dispatch(
    moveEventAsync({
      cal: targetCalendar,
      newEvent,
      newURL,
    })
  );
  await assertThunkSuccess(moveResult);
}

interface DelegatedMoveParams {
  dispatch: AppDispatch;
  newEvent: CalendarEvent;
  oldCalendar: Calendar;
  targetCalendar: Calendar;
}

async function moveDelegatedEvent({
  dispatch,
  newEvent,
  oldCalendar,
  targetCalendar,
}: DelegatedMoveParams): Promise<void> {
  const newCalId = targetCalendar.id;

  const newOrganizer = resolveOrganizerForCalendar(
    targetCalendar,
    newEvent.organizer
  );

  const newAttendees = rewriteAttendeesForOrganizerChange(
    newEvent.attendee ?? [],
    newEvent.organizer,
    newOrganizer
  );

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

  const putResult = await dispatch(
    putEventAsync({ cal: targetCalendar, newEvent: eventForTargetCalendar })
  );

  const typedPutResult = putResult as AsyncThunkResult;
  if (typedPutResult && typeof typedPutResult.unwrap === "function") {
    await typedPutResult.unwrap();
  } else {
    await assertThunkSuccess(putResult);
  }

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
    await assertThunkSuccess(deleteResult);
  }
}
