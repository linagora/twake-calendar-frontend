import { buildDelegatedEventURL } from "@/features/Events/eventUtils";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { CalendarEvent } from "@/features/Events/EventsTypes";

const makeCalendar = (link: string): Calendar =>
  ({
    id: "user2/cal1",
    delegated: true,
    link,
    owner: { emails: ["owner@example.com"] },
  }) as Calendar;

const makeEvent = (url: string): CalendarEvent =>
  ({ URL: url, calId: "user2/cal1" }) as CalendarEvent;

describe("buildDelegatedEventURL", () => {
  it("rebases event filename onto calendar link base path", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const event = makeEvent("/calendars/someother/path/event-abc.ics");
    expect(buildDelegatedEventURL(calendar, event)).toBe(
      "/calendars/user2/cal1/event-abc.ics"
    );
  });

  it("strips .json suffix from calendar link", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const event = makeEvent("/calendars/user2/cal1/event-abc.ics");
    const result = buildDelegatedEventURL(calendar, event);
    expect(result).not.toContain(".json");
  });

  it("preserves the exact filename from the event URL", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const event = makeEvent("/calendars/user2/cal1/some-uid-with-dashes.ics");
    expect(buildDelegatedEventURL(calendar, event)).toBe(
      "/calendars/user2/cal1/some-uid-with-dashes.ics"
    );
  });

  it("throws when event URL has no filename", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const event = makeEvent("");
    expect(() => buildDelegatedEventURL(calendar, event)).toThrow(
      /Cannot extract filename from event URL/
    );
  });

  it("works with nested calendar link paths", () => {
    const calendar = makeCalendar("/dav/calendars/users/user2/cal1.json");
    const event = makeEvent("/other/path/event-xyz.ics");
    expect(buildDelegatedEventURL(calendar, event)).toBe(
      "/dav/calendars/users/user2/cal1/event-xyz.ics"
    );
  });
});
