import {
  eventToFullCalendarFormat,
  getCalendarVisibility,
} from "@/components/Calendar/utils/calendarUtils";
import { Calendar, DelegationAccess } from "@/features/Calendars/CalendarTypes";
import { AclEntry } from "@/features/Calendars/types/CalendarData";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { userOrganiser } from "@/features/User/userDataTypes";

describe("getCalendarVisibility", () => {
  it("returns 'public' when {DAV:}authenticated has {DAV:}read", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("public");
  });

  it("returns 'private' when {DAV:}authenticated only has read-free-busy", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{urn:ietf:params:xml:ns:caldav}read-free-busy",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("returns 'private' when {DAV:}authenticated is not present", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "principals/users/123",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("ignores non-authenticated principals and still returns 'private'", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "principals/users/other",
        protected: true,
      },
      {
        privilege: "{DAV:}write",
        principal: "principals/users/other",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("private");
  });

  it("stops early when it finds a {DAV:}read for {DAV:}authenticated", () => {
    const acl: AclEntry[] = [
      {
        privilege: "{DAV:}read",
        principal: "{DAV:}authenticated",
        protected: true,
      },
      {
        privilege: "{DAV:}write",
        principal: "{DAV:}authenticated",
        protected: true,
      },
    ];
    expect(getCalendarVisibility(acl)).toBe("public");
  });
});

jest.mock("twake-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const baseEvent: CalendarEvent = {
  uid: "event-1",
  calId: "user1/cal1",
  title: "Test Event",
  start: "2024-01-15T10:00:00",
  end: "2024-01-15T11:00:00",
  allday: false,
  organizer: { cal_address: "owner@example.com" } as userOrganiser,
  color: { light: "#FF0000" },
} as unknown as CalendarEvent;

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar =>
  ({
    id: "user1/cal1",
    name: "Test Calendar",
    delegated: false,
    access: {} as DelegationAccess,
    owner: { emails: ["alice@example.com"], firstname: "Alice" },
    color: { light: "#FF0000" },
    events: {},
    ...overrides,
  }) as Calendar;

const callFormat = (
  event: CalendarEvent,
  calendars: Record<string, Calendar>,
  userAddress = "alice@example.com",
  userId = "user1"
) =>
  eventToFullCalendarFormat([event], [], userId, userAddress, false, calendars);

describe("eventToFullCalendarFormat - editable flag", () => {
  describe("personal calendar (non-delegated)", () => {
    const calendar = makeCalendar({ delegated: false });

    it("is editable when user is organizer", () => {
      const event = {
        ...baseEvent,
        organizer: { cal_address: "alice@example.com" },
      } as CalendarEvent;
      const [result] = callFormat(event, { "user1/cal1": calendar });
      expect(result.editable).toBe(true);
    });

    it("is not editable when user is not organizer", () => {
      const event = {
        ...baseEvent,
        organizer: { cal_address: "other@example.com" },
      } as CalendarEvent;
      const [result] = callFormat(event, { "user1/cal1": calendar });
      expect(result.editable).toBe(false);
    });

    it("is not editable when pending", () => {
      const event = {
        ...baseEvent,
        organizer: { cal_address: "alice@example.com" },
      } as CalendarEvent;
      const [result] = eventToFullCalendarFormat(
        [event],
        [],
        "user1",
        "alice@example.com",
        true,
        { "user1/cal1": calendar }
      );
      expect(result.editable).toBe(false);
    });
  });

  describe("delegated calendar", () => {
    const writeDelegatedCalendar = makeCalendar({
      id: "user2/cal1",
      delegated: true,
      access: { write: true } as DelegationAccess,
      owner: { emails: ["owner@example.com"], firstname: "Owner" },
    });
    const readDelegatedCalendar = makeCalendar({
      id: "user2/cal1",
      delegated: true,
      access: { read: true } as DelegationAccess,
      owner: { emails: ["owner@example.com"], firstname: "Owner" },
    });
    const event = { ...baseEvent, calId: "user2/cal1" };

    it("is editable when owner is organizer and delegated user has write rights", () => {
      const [result] = callFormat(
        {
          ...event,
          organizer: { cal_address: "owner@example.com" },
        } as CalendarEvent,
        { "user2/cal1": writeDelegatedCalendar }
      );
      expect(result.editable).toBe(true);
    });

    it("is not editable when owner is organizer but delegated user only has read access", () => {
      const [result] = callFormat(
        {
          ...event,
          organizer: { cal_address: "owner@example.com" },
        } as CalendarEvent,
        { "user2/cal1": readDelegatedCalendar }
      );
      expect(result.editable).toBe(false);
    });

    it("is not editable when owner is not organizer", () => {
      const [result] = callFormat(
        {
          ...event,
          organizer: { cal_address: "someone-else@example.com" },
        } as CalendarEvent,
        { "user2/cal1": writeDelegatedCalendar }
      );
      expect(result.editable).toBe(false);
    });

    it("is not editable when pending even if owner is organizer", () => {
      const [result] = eventToFullCalendarFormat(
        [
          {
            ...event,
            organizer: { cal_address: "owner@example.com" },
          } as CalendarEvent,
        ],
        [],
        "user1",
        "alice@example.com",
        true,
        { "user2/cal1": writeDelegatedCalendar }
      );
      expect(result.editable).toBe(false);
    });

    it("uses owner email not logged-in user email for organizer check", () => {
      // logged-in user is alice, owner is owner@example.com
      // organizer matches owner → editable
      const [result] = callFormat(
        {
          ...event,
          organizer: { cal_address: "owner@example.com" },
        } as CalendarEvent,
        { "user2/cal1": writeDelegatedCalendar },
        "alice@example.com" // logged-in user, should NOT be used for delegated
      );
      expect(result.editable).toBe(true);
    });
  });
});
