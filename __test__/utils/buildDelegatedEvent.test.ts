import { Calendar } from "@/features/Calendars/CalendarTypes";
import { buildDelegatedEventURL } from "@/features/Events/eventUtils";

const makeCalendar = (link: string): Calendar =>
  ({
    id: "user2/cal1",
    delegated: true,
    link,
    owner: { emails: ["owner@example.com"] },
  }) as Calendar;

describe("buildDelegatedEventURL", () => {
  it("rebases event filename onto calendar link base path", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const eventURL = "/calendars/someother/path/event-abc.ics";
    expect(buildDelegatedEventURL(calendar, eventURL)).toBe(
      "/calendars/user2/cal1/event-abc.ics"
    );
  });

  it("strips .json suffix from calendar link", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const eventURL = "/calendars/user2/cal1/event-abc.ics";
    const result = buildDelegatedEventURL(calendar, eventURL);
    expect(result).not.toContain(".json");
  });

  it("preserves the exact filename from the event URL", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const eventURL = "/calendars/user2/cal1/some-uid-with-dashes.ics";
    expect(buildDelegatedEventURL(calendar, eventURL)).toBe(
      "/calendars/user2/cal1/some-uid-with-dashes.ics"
    );
  });

  it("throws when event URL has no filename", () => {
    const calendar = makeCalendar("/calendars/user2/cal1.json");
    const eventURL = "";
    expect(() => buildDelegatedEventURL(calendar, eventURL)).toThrow(
      /Cannot extract filename from event URL/
    );
  });

  it("works with nested calendar link paths", () => {
    const calendar = makeCalendar("/dav/calendars/users/user2/cal1.json");
    const eventURL = "/other/path/event-xyz.ics";
    expect(buildDelegatedEventURL(calendar, eventURL)).toBe(
      "/dav/calendars/users/user2/cal1/event-xyz.ics"
    );
  });
});
