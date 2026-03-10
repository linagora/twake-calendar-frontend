import { getFreeBusyForAddedAttendeesREPORT } from "@/features/Events/api/getFreeBusyForAddedAttendeesREPORT";
import { getFreeBusyForEventAttendeesPOST } from "@/features/Events/api/getFreeBusyForEventAttendeesPOST";
import { getUserDataFromEmail } from "@/features/Events/api/getUserDataFromEmail";
import moment from "moment-timezone";
import { useEffect, useRef, useState } from "react";

export type FreeBusyStatus =
  | "free"
  | "busy"
  | "loading"
  | "contact"
  | "unknown";
export type FreeBusyMap = Record<string, FreeBusyStatus>;

interface Attendee {
  email: string;
  userId?: string | null;
}

interface ResolvedAttendee {
  email: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveUserId(attendee: Attendee): Promise<string | null> {
  if (attendee.userId) return attendee.userId;
  return getUserDataFromEmail(attendee.email)
    .then((u) => u[0]?._id ?? null)
    .catch(() => null);
}

async function resolveAll(attendees: Attendee[]): Promise<ResolvedAttendee[]> {
  const results = await Promise.all(
    attendees.map(async (a) => {
      const userId = await resolveUserId(a);
      return userId ? { email: a.email, userId } : null;
    })
  );
  return results.filter((r): r is ResolvedAttendee => r !== null);
}

export function hasFreeBusyConflict(data: unknown): boolean {
  try {
    const jcal = (data as { data: unknown[] }).data;
    if (!Array.isArray(jcal) || jcal[0] !== "vcalendar") return false;
    const components = jcal[2] as unknown[][];
    return (
      Array.isArray(components) && components.some(isVFreeBusyWithConflict)
    );
  } catch {
    return false;
  }
}

function isVFreeBusyWithConflict(component: unknown): boolean {
  if (!Array.isArray(component) || component[0] !== "vfreebusy") return false;
  const props = component[1] as unknown[][];
  return (
    Array.isArray(props) &&
    props.some((p) => Array.isArray(p) && p[0] === "freebusy")
  );
}

function toUtcIcal(datetime: string, timezone: string): string {
  return moment.tz(datetime, timezone).utc().format("YYYYMMDDTHHmmss");
}

async function fetchFreeBusyMap(
  attendees: Attendee[],
  fetcher: (resolved: ResolvedAttendee[]) => Promise<FreeBusyMap>
): Promise<FreeBusyMap> {
  const resolved = await resolveAll(attendees);

  const unresolved: FreeBusyMap = Object.fromEntries(
    attendees
      .filter((a) => !resolved.find((r) => r.email === a.email))
      .map((a) => [a.email, "unknown" as FreeBusyStatus])
  );

  if (resolved.length === 0) return unresolved;

  const fetched = await fetcher(resolved);
  return { ...unresolved, ...fetched };
}

function toLoadingMap(attendees: Attendee[]): FreeBusyMap {
  return Object.fromEntries(
    attendees.map((a) => [a.email, "loading" as FreeBusyStatus])
  );
}

function toUnknownMap(attendees: Attendee[]): FreeBusyMap {
  return Object.fromEntries(
    attendees.map((a) => [a.email, "unknown" as FreeBusyStatus])
  );
}

function toFreeBusyMap(
  resolved: ResolvedAttendee[]
): (busyByUserId: Record<string, boolean>) => FreeBusyMap {
  const userIdToEmail = Object.fromEntries(
    resolved.map(({ email, userId }) => [userId, email])
  );
  return (busyByUserId) =>
    Object.fromEntries(
      Object.entries(busyByUserId).flatMap(([uid, busy]) => {
        const email = userIdToEmail[uid];
        return email
          ? [[email, (busy ? "busy" : "free") as FreeBusyStatus]]
          : [];
      })
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAttendeesFreeBusyOptions {
  /** Attendees present when the form opened — queried via bulk POST. */
  existingAttendees: Attendee[];
  /** Attendees added during this editing session — queried via per-user REPORT. */
  newAttendees: Attendee[];
  start: string;
  end: string;
  timezone: string;
  /** UID of the event being edited — required for Flow A (bulk POST). */
  eventUid?: string | null;
  enabled?: boolean;
}

export function useAttendeesFreeBusy({
  existingAttendees,
  newAttendees,
  start,
  end,
  timezone,
  eventUid,
  enabled = true,
}: UseAttendeesFreeBusyOptions): FreeBusyMap {
  const [statusMap, setStatusMap] = useState<FreeBusyMap>({});
  const fetchedNewEmailsRef = useRef<Set<string>>(new Set());

  const existingKey = existingAttendees.map((a) => a.email).join(",");
  const newKey = newAttendees.map((a) => a.email).join(",");

  // Invalidate all cached results when the time window or timezone changes
  useEffect(() => {
    fetchedNewEmailsRef.current = new Set();
    setStatusMap({});
  }, [start, end, timezone]);

  // Flow A — existing attendees via bulk POST
  useEffect(() => {
    if (
      !enabled ||
      !start ||
      !end ||
      !eventUid ||
      existingAttendees.length === 0
    )
      return;

    let cancelled = false;
    setStatusMap((prev) => ({ ...prev, ...toLoadingMap(existingAttendees) }));

    fetchFreeBusyMap(existingAttendees, (resolved) =>
      getFreeBusyForEventAttendeesPOST(
        resolved.map((r) => r.userId),
        toUtcIcal(start, timezone),
        toUtcIcal(end, timezone),
        eventUid!
      ).then(toFreeBusyMap(resolved))
    )
      .then((updates) => {
        if (!cancelled) setStatusMap((prev) => ({ ...prev, ...updates }));
      })
      .catch(() => {
        if (!cancelled)
          setStatusMap((prev) => ({
            ...prev,
            ...toUnknownMap(existingAttendees),
          }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey, start, end, eventUid, enabled, timezone]);

  // Flow B — newly added attendees via per-user REPORT
  useEffect(() => {
    if (!enabled || !start || !end) return;

    // Remove departed attendees from the map
    const currentEmails = new Set(newAttendees.map((a) => a.email));
    const removedEmails = [...fetchedNewEmailsRef.current].filter(
      (e) => !currentEmails.has(e)
    );
    if (removedEmails.length > 0) {
      removedEmails.forEach((e) => fetchedNewEmailsRef.current.delete(e));
      setStatusMap((prev) => {
        const next = { ...prev };
        removedEmails.forEach((e) => delete next[e]);
        return next;
      });
    }

    const toFetch = newAttendees.filter(
      (a) => !fetchedNewEmailsRef.current.has(a.email)
    );
    console.log("[FreeBusy Flow B]", {
      newAttendees,
      toFetch,
      fetched: [...fetchedNewEmailsRef.current],
    });
    if (toFetch.length === 0) return;

    let cancelled = false;
    setStatusMap((prev) => ({ ...prev, ...toLoadingMap(toFetch) }));

    fetchFreeBusyMap(toFetch, (resolved) =>
      Promise.all(
        resolved.map(async ({ email, userId }) => {
          const busy = await getFreeBusyForAddedAttendeesREPORT(
            userId,
            toUtcIcal(start, timezone),
            toUtcIcal(end, timezone)
          );
          return [email, (busy ? "busy" : "free") as FreeBusyStatus] as const;
        })
      ).then(Object.fromEntries)
    )
      .then((updates) => {
        if (!cancelled) {
          Object.keys(updates).forEach((e) =>
            fetchedNewEmailsRef.current.add(e)
          );
          setStatusMap((prev) => ({ ...prev, ...updates }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toFetch.forEach((a) => fetchedNewEmailsRef.current.add(a.email));
          setStatusMap((prev) => ({ ...prev, ...toUnknownMap(toFetch) }));
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newKey, start, end, enabled, timezone]);

  return statusMap;
}
