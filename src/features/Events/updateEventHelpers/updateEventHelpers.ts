import { AppDispatch } from "@/app/store";
import {
  putEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync,
} from "@/features/Calendars/services";
import { assertThunkSuccess, unwrapOrAssert } from "@/utils/assertThunkSuccess";
import { clearEventFormTempData } from "@/utils/eventFormTempStorage";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { resolveTimezone } from "@/utils/timezone";
import {
  clearFetchCache,
  removeEvent,
  updateEventLocal,
} from "../../Calendars/CalendarSlice";
import { Calendar } from "../../Calendars/CalendarTypes";
import { deleteEvent, putEvent } from "../EventApi";
import { CalendarEvent, RepetitionObject } from "../EventsTypes";
import { detectRecurringEventChanges } from "../eventUtils";

export interface ConvertRecurringToSingleParams {
  dispatch: AppDispatch;
  event: CalendarEvent;
  newEvent: CalendarEvent;
  targetCalendar: Calendar;
  calId: string;
  newCalId: string;
  getSeriesInstances: () => Record<string, CalendarEvent>;
  onSuccess: () => void;
  onError: (err: unknown) => void;
}

export interface UpdateRecurringParams {
  dispatch: AppDispatch;
  calList: Record<string, Calendar>;
  newEvent: CalendarEvent;
  calId: string;
  event: CalendarEvent;
  recurrenceId: string;
  typeOfAction: "solo" | "all" | undefined;
  masterEventData: CalendarEvent | null;
  repetition: RepetitionObject;
  timezone: string;
  allday: boolean;
  start: string;
  end: string;
}

export interface UpdateSingleEventParams {
  dispatch: AppDispatch;
  newEvent: CalendarEvent;
  calId: string;
  newCalId: string;
  event: CalendarEvent;
  targetCalendar: Calendar;
}

export async function convertRecurringToSingleEvent({
  dispatch,
  event,
  newEvent,
  targetCalendar,
  calId,
  newCalId,
  getSeriesInstances,
  onSuccess,
  onError,
}: ConvertRecurringToSingleParams): Promise<void> {
  const baseUID = extractEventBaseUuid(event.uid);

  const seriesInstancesSnapshot = getSeriesInstances();
  let hasRemovedSeriesInstances = false;
  let createdSingleEventUid: string | null = null;

  const removeSeriesInstancesFromUI = () => {
    if (!seriesInstancesSnapshot) return;
    Object.keys(seriesInstancesSnapshot).forEach((eventId) => {
      dispatch(removeEvent({ calendarUid: calId, eventUid: eventId }));
    });
    hasRemovedSeriesInstances = true;
  };

  const restoreSeriesInstancesToUI = () => {
    if (!seriesInstancesSnapshot) return;
    Object.values(seriesInstancesSnapshot).forEach((instance) => {
      dispatch(updateEventLocal({ calId, event: instance }));
    });
  };

  try {
    // STEP 1: Delete ALL instances of recurring event
    // Note: This system stores instances only, no master event file

    // Collect all instances that need to be deleted
    const instancesToDelete = Object.keys(targetCalendar.events)
      .filter((eventId) => extractEventBaseUuid(eventId) === baseUID)
      .map((eventId) => targetCalendar.events[eventId]);

    // Get unique URLs to avoid deleting same file multiple times
    const uniqueURLs = new Set<string>();
    const instancesByURL = new Map<string, CalendarEvent[]>();

    instancesToDelete.forEach((instance) => {
      if (!instancesByURL.has(instance.URL)) {
        instancesByURL.set(instance.URL, []);
      }
      instancesByURL.get(instance.URL)!.push(instance);
      uniqueURLs.add(instance.URL);
    });

    // Delete each unique URL once
    const deletePromises = Array.from(uniqueURLs).map(async (url) => {
      try {
        await deleteEvent(url);
      } catch (deleteError) {
        const errorObj = deleteError as {
          response?: { status?: number };
          message?: string;
        };

        // Silently ignore 404 - file might already be deleted
        const is404 =
          errorObj.response?.status === 404 ||
          errorObj.message?.includes("404") ||
          errorObj.message?.includes("Not Found");

        if (!is404) {
          console.error(
            `Failed to delete event file: ${errorObj.message || "Unknown error"}`
          );
        }
      }
    });

    await Promise.all(deletePromises);

    // Small delay to ensure backend processes deletions
    await new Promise((resolve) => setTimeout(resolve, 100));

    // STEP 2: Create new non-recurring event
    const newEventUID = crypto.randomUUID();
    const finalNewEvent = {
      ...newEvent,
      uid: newEventUID,
      URL: `/calendars/${newCalId || calId}/${newEventUID}.ics`,
      sequence: 1, // New event with new UID starts at sequence 1
      recurrenceId: undefined,
    };

    // STEP 3: Persist new event to server
    await putEvent(finalNewEvent, targetCalendar.owner?.emails?.[0]);

    // STEP 4: Update Redux store - Add new event first to prevent empty grid
    dispatch(updateEventLocal({ calId, event: finalNewEvent }));
    createdSingleEventUid = finalNewEvent.uid;

    // Clear cache to ensure navigation to other weeks works
    dispatch(clearFetchCache(calId));

    // STEP 5: Remove old recurring instances only after the rest succeeds
    removeSeriesInstancesFromUI();

    // Clear temp data on successful save
    clearEventFormTempData("update");

    // Reset all state to default values only on successful save
    onSuccess();
  } catch (err) {
    if (createdSingleEventUid) {
      dispatch(
        removeEvent({ calendarUid: calId, eventUid: createdSingleEventUid })
      );
    }

    if (hasRemovedSeriesInstances) {
      restoreSeriesInstancesToUI();
    }

    onError(err);
  }
}

export async function updateRecurringEvent({
  dispatch,
  calList,
  newEvent,
  calId,
  event,
  recurrenceId,
  typeOfAction,
  masterEventData,
  repetition,
  timezone,
  allday,
  start,
  end,
}: UpdateRecurringParams): Promise<void> {
  const targetCalendar = calList[calId];
  const baseUID = extractEventBaseUuid(event.uid);

  const getSeriesInstances = (): Record<string, CalendarEvent> => {
    const instances: Record<string, CalendarEvent> = {};
    const seriesEvents = targetCalendar.events || {};
    Object.keys(seriesEvents).forEach((eventId) => {
      const instance = seriesEvents[eventId];
      if (instance && extractEventBaseUuid(eventId) === baseUID) {
        instances[eventId] = { ...instance };
      }
    });
    return instances;
  };

  if (typeOfAction === "solo") {
    // Update single instance with optimistic update + rollback
    dispatch(
      updateEventLocal({
        calId,
        event: { ...newEvent, recurrenceId },
      })
    );

    const result = await dispatch(
      updateEventInstanceAsync({
        cal: targetCalendar,
        event: { ...newEvent, recurrenceId },
      })
    );

    // Handle result of updateEventInstanceAsync
    assertThunkSuccess(result);

    // Clear temp data on successful save
    clearEventFormTempData("update");
    return;
  }

  if (typeOfAction === "all") {
    // Update all instances - check if repetition rules changed
    const changes = detectRecurringEventChanges(
      event,
      { repetition, timezone, allday, start, end },
      masterEventData,
      resolveTimezone
    );
    const repetitionRulesChanged = changes.repetitionRulesChanged;

    if (repetitionRulesChanged) {
      // Date/time or repetition rules changed - remove all overrides
      const seriesInstancesSnapshot = getSeriesInstances();

      const removeSeriesInstancesFromUI = () => {
        Object.keys(seriesInstancesSnapshot).forEach((eventId) => {
          dispatch(removeEvent({ calendarUid: calId, eventUid: eventId }));
        });
      };

      const restoreSeriesInstancesFromSnapshot = () => {
        Object.values(seriesInstancesSnapshot).forEach((instance) => {
          dispatch(updateEventLocal({ calId, event: instance }));
        });
      };

      try {
        // STEP 1: Remove ALL old instances from UI (including solo overrides)
        removeSeriesInstancesFromUI();

        // STEP 2: Update series on server with removeOverrides=true
        // IMPORTANT: Use base event UID (master), not instance UID with recurrence-id
        const masterEventForUpdate = {
          ...newEvent,
          uid: baseUID, // Use base UID for updating the master
          recurrenceId: undefined, // Don't send recurrence-id for master update
        };

        const result = await dispatch(
          updateSeriesAsync({
            cal: targetCalendar,
            event: masterEventForUpdate,
            removeOverrides: true,
          })
        );

        // Handle result of updateSeriesAsync
        assertThunkSuccess(result);

        // Clear cache after successful update
        dispatch(clearFetchCache(calId));

        // Clear temp data on successful save
        clearEventFormTempData("update");
      } catch (seriesError) {
        // Restore instances on error
        restoreSeriesInstancesFromSnapshot();
        throw seriesError;
      }
    } else {
      // Only properties changed - use optimistic update and keep overrides

      // Store old instances for rollback
      const oldInstances = getSeriesInstances();

      // Optimistic update: Apply new properties to all instances immediately
      Object.keys(oldInstances).forEach((eventId) => {
        const instance = oldInstances[eventId];
        dispatch(
          updateEventLocal({
            calId,
            event: {
              ...instance,
              title: newEvent.title,
              description: newEvent.description,
              location: newEvent.location,
              class: newEvent.class,
              transp: newEvent.transp,
              attendee: newEvent.attendee,
              alarm: newEvent.alarm,
              x_openpass_videoconference: newEvent.x_openpass_videoconference,
            },
          })
        );
      });

      // Update server in background with removeOverrides=false
      // IMPORTANT: Use base event UID (master), not instance UID with recurrence-id
      const masterEventForUpdate = {
        ...newEvent,
        uid: baseUID, // Use base UID for updating the master
        recurrenceId: undefined, // Don't send recurrence-id for master update
      };

      const result = await dispatch(
        updateSeriesAsync({
          cal: targetCalendar,
          event: masterEventForUpdate,
          removeOverrides: false,
        })
      );

      // Handle result of updateSeriesAsync
      assertThunkSuccess(result);

      // Clear cache to ensure navigation shows updated data
      dispatch(clearFetchCache(calId));

      // Clear temp data on successful save
      clearEventFormTempData("update");
    }
  }
}

export async function updateSingleEvent({
  dispatch,
  newEvent,
  calId,
  newCalId,
  event,
  targetCalendar,
}: UpdateSingleEventParams): Promise<void> {
  // Special case: Converting no-repeat to repeat
  if (!event.repetition?.freq && newEvent.repetition?.freq) {
    const oldEventUID = event.uid;

    // API call: putEventAsync will create recurring event and fetch all instances
    const result = await dispatch(
      putEventAsync({ cal: targetCalendar, newEvent })
    );

    // Handle result of putEventAsync - check if rejected first
    assertThunkSuccess(result);

    // Remove old single event AFTER new recurring instances are added to store
    // This prevents empty grid during the transition
    dispatch(removeEvent({ calendarUid: calId, eventUid: oldEventUID }));

    // Clear cache to ensure navigation to other weeks works
    dispatch(clearFetchCache(calId));

    // Clear temp data on successful save
    clearEventFormTempData("update");
    return;
  }

  if (newCalId === calId) {
    // Normal non-recurring event update (same calendar)
    const result = await dispatch(
      putEventAsync({ cal: targetCalendar, newEvent })
    );

    unwrapOrAssert(result);

    // Clear temp data on successful save
    clearEventFormTempData("update");
    return;
  }
}
