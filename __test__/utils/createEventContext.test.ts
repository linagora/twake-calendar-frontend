import { createEventContext } from "@/features/Events/createEventContext";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { userData } from "@/features/User/userDataTypes";
import { userAttendee } from "@/features/User/models/attendee";

const makeUser = (email: string): userData => ({
  email,
  given_name: "Alice",
  family_name: "User",
  name: "Alice User",
  sid: "user1",
  sub: "user1",
});

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    uid: "event-1",
    calId: "user1/cal1",
    title: "Test Event",
    start: "2024-01-15T10:00:00",
    end: "2024-01-15T11:00:00",
    organizer: { cal_address: "alice@example.com" },
    attendee: [
      { cal_address: "alice@example.com", partstat: "ACCEPTED" },
      { cal_address: "owner@example.com", partstat: "ACCEPTED" },
      { cal_address: "other@example.com", partstat: "NEEDS-ACTION" },
    ],
    ...overrides,
  }) as CalendarEvent;

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar =>
  ({
    id: "user1/cal1",
    name: "Test Calendar",
    delegated: false,
    owner: { emails: ["alice@example.com"], firstname: "Alice" },
    events: {},
    ...overrides,
  }) as Calendar;

describe("createEventContext", () => {
  describe("non-delegated calendar", () => {
    const calendar = makeCalendar({ delegated: false });
    const user = makeUser("alice@example.com");

    it("finds currentUserAttendee by logged-in user email", () => {
      const event = makeEvent();
      const ctx = createEventContext(event, calendar, user);
      expect(ctx.currentUserAttendee?.cal_address).toBe("alice@example.com");
    });

    it("returns null currentUserAttendee when user is not an attendee", () => {
      const event = makeEvent({ attendee: [] });
      const ctx = createEventContext(event, calendar, user);
      expect(ctx.currentUserAttendee).toBeUndefined();
    });

    it("isOwn is true when user email is in owner emails", () => {
      const ctx = createEventContext(makeEvent(), calendar, user);
      expect(ctx.isOwn).toBe(true);
    });

    it("isOwn is false when user email is not in owner emails", () => {
      const other = makeUser("other@example.com");
      const ctx = createEventContext(makeEvent(), calendar, other);
      expect(ctx.isOwn).toBe(false);
    });
  });

  describe("delegated calendar", () => {
    const calendar = makeCalendar({
      id: "user2/cal1",
      delegated: true,
      owner: { emails: ["owner@example.com"], firstname: "Owner" },
    });
    const user = makeUser("alice@example.com"); // logged-in user, not the owner

    it("finds currentUserAttendee by owner email, not logged-in user email", () => {
      const event = makeEvent({ calId: "user2/cal1" });
      const ctx = createEventContext(event, calendar, user);
      expect(ctx.currentUserAttendee?.cal_address).toBe("owner@example.com");
    });

    it("does not find logged-in user as attendee for delegated calendar", () => {
      const event = makeEvent({
        calId: "user2/cal1",
        attendee: [
          {
            cal_address: "owner@example.com",
            partstat: "ACCEPTED",
          } as userAttendee,
        ],
      });
      const ctx = createEventContext(event, calendar, user);
      // currentUserAttendee should be owner's, not alice's
      expect(ctx.currentUserAttendee?.cal_address).toBe("owner@example.com");
    });

    it("returns undefined currentUserAttendee when owner is not an attendee", () => {
      const event = makeEvent({
        calId: "user2/cal1",
        attendee: [
          {
            cal_address: "alice@example.com",
            partstat: "ACCEPTED",
          } as userAttendee,
        ],
      });
      const ctx = createEventContext(event, calendar, user);
      expect(ctx.currentUserAttendee).toBeUndefined();
    });

    it("passes event through unchanged", () => {
      const event = makeEvent({ calId: "user2/cal1" });
      const ctx = createEventContext(event, calendar, user);
      expect(ctx.event).toBe(event);
    });
  });
});
