import { Calendar } from "@/features/Calendars/CalendarTypes";
import { VObjectProperty } from "@/features/Calendars/types/CalendarData";
import { putEvent, putEventWithOverrides } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import {
  calendarEventToJCal,
  makeVevent,
  parseCalendarEvent,
} from "@/features/Events/utils";
import { api } from "@/utils/apiUtils";

jest.mock("@/utils/apiUtils");

const MOCK_CALENDAR: Calendar = {
  id: "cal-1",
  link: "/dav/calendars/user/cal-1.json",
} as Calendar;
const EVENT_URL = "/dav/calendars/user/cal-1/event-abc.ics";

const mockEvent = {
  uid: "event-123",
  title: "Test Event",
  start: "2025-07-23T08:00:00.000Z",
  end: "2025-07-23T09:00:00.000Z",
  timezone: "Europe/Paris",
  allday: false,
  attendee: [],
  passthroughProps: [
    ["x-attachment", {}, "text", "data:application/pdf;base64,abc123=="],
    ["x-custom-prop", {}, "text", "custom-value"],
  ] as VObjectProperty[],
} as unknown as CalendarEvent;

/** Minimal valid vevent props (dtstart is a timed event in Europe/Paris) */
function baseVeventProps(overrides: VObjectProperty[] = []): VObjectProperty[] {
  return [
    ["uid", {}, "text", "event-abc-uid"],
    ["summary", {}, "text", "Team standup"],
    ["dtstart", { tzid: "Europe/Paris" }, "date-time", "2024-03-15T10:00:00"],
    ["dtend", { tzid: "Europe/Paris" }, "date-time", "2024-03-15T10:30:00"],
    ["dtstamp", {}, "date-time", "2024-03-01T00:00:00Z"],
    ["sequence", {}, "integer", 0],
    ...overrides,
  ];
}

/** X- / custom props that must survive round-trips */
const CUSTOM_PROPS: VObjectProperty[] = [
  ["x-attachment", {}, "text", "base64encodeddata=="],
  ["x-apple-travel-title", {}, "text", "Drive to office"],
  ["x-custom-field", {}, "unknown", "some-value"],
];

/** Build a CalendarEvent directly (skips parseCalendarEvent) for makeVevent tests */
function baseCalendarEvent(
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
  return {
    uid: "event-abc-uid",
    title: "Team standup",
    start: "2024-03-15T09:00:00.000Z",
    end: "2024-03-15T09:30:00.000Z",
    timezone: "Europe/Paris",
    allday: false,
    attendee: [],
    calId: "cal-1",
    URL: EVENT_URL,
    transp: "OPAQUE",
    class: "PUBLIC",
    sequence: 1,
    exdates: [],
    ...overrides,
  } as CalendarEvent;
}

describe("parseCalendarEvent — passthroughProps", () => {
  it("captures unknown X- properties into passthroughProps", () => {
    const props = baseVeventProps(CUSTOM_PROPS);
    const event = parseCalendarEvent(props, {}, MOCK_CALENDAR, EVENT_URL);

    expect(event.passthroughProps).toBeDefined();
    const keys = event.passthroughProps!.map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
    expect(keys).toContain("x-apple-travel-title");
    expect(keys).toContain("x-custom-field");
  });

  it("preserves the full tuple structure of passthrough props", () => {
    const props = baseVeventProps(CUSTOM_PROPS);
    const event = parseCalendarEvent(props, {}, MOCK_CALENDAR, EVENT_URL);

    const attachment = event.passthroughProps!.find(
      ([k]) => k === "x-attachment"
    );
    expect(attachment).toEqual([
      "x-attachment",
      {},
      "text",
      "base64encodeddata==",
    ]);
  });

  it("does NOT include known props in passthroughProps", () => {
    const props = baseVeventProps(CUSTOM_PROPS);
    const event = parseCalendarEvent(props, {}, MOCK_CALENDAR, EVENT_URL);

    const known = ["uid", "summary", "dtstart", "dtend", "dtstamp", "sequence"];
    const passthroughKeys = event.passthroughProps!.map(([k]) =>
      k.toLowerCase()
    );
    for (const k of known) {
      expect(passthroughKeys).not.toContain(k);
    }
  });

  it("sets passthroughProps to empty array when no unknown props exist", () => {
    const event = parseCalendarEvent(
      baseVeventProps(),
      {},
      MOCK_CALENDAR,
      EVENT_URL
    );
    expect(event.passthroughProps).toEqual([]);
  });

  it("parses known fields correctly alongside custom props", () => {
    const props = baseVeventProps(CUSTOM_PROPS);
    const event = parseCalendarEvent(props, {}, MOCK_CALENDAR, EVENT_URL);

    expect(event.title).toBe("Team standup");
    expect(event.uid).toBe("event-abc-uid");
    expect(event.allday).toBe(false);
  });
});

describe("makeVevent — passthroughProps round-trip", () => {
  it("injects passthroughProps into the vevent output", () => {
    const event = baseCalendarEvent({ passthroughProps: CUSTOM_PROPS });
    const [, props] = makeVevent(event, "Europe/Paris", undefined);

    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
    expect(keys).toContain("x-apple-travel-title");
    expect(keys).toContain("x-custom-field");
  });

  it("preserves the exact value of passthrough props", () => {
    const event = baseCalendarEvent({ passthroughProps: CUSTOM_PROPS });
    const [, props] = makeVevent(event, "Europe/Paris", undefined);

    const attachment = (props as VObjectProperty[]).find(
      ([k]) => k === "x-attachment"
    );
    expect(attachment?.[3]).toBe("base64encodeddata==");
  });

  it("does NOT duplicate a prop that is already written by makeVevent", () => {
    // If somehow a passthrough prop overlaps a known key, it must not be doubled
    const duplicateSummary: VObjectProperty = [
      "summary",
      {},
      "text",
      "duplicate",
    ];
    const event = baseCalendarEvent({ passthroughProps: [duplicateSummary] });
    const [, props] = makeVevent(event, "Europe/Paris", undefined);

    const summaries = (props as VObjectProperty[]).filter(
      ([k]) => k === "summary"
    );
    expect(summaries.length).toBe(1);
  });

  it("produces a vevent with no passthroughProps when field is undefined", () => {
    const event = baseCalendarEvent({ passthroughProps: undefined });
    const [name, props] = makeVevent(event, "Europe/Paris", undefined);

    expect(name).toBe("vevent");
    expect(Array.isArray(props)).toBe(true);
  });

  it("produces a vevent with no passthroughProps when field is empty array", () => {
    const event = baseCalendarEvent({ passthroughProps: [] });
    const [, props] = makeVevent(event, "Europe/Paris", undefined);
    // Just check it doesn't throw and still has standard props
    const keys = (props as VObjectProperty[]).map(([k]) => k);
    expect(keys).toContain("uid");
    expect(keys).toContain("summary");
  });
});

describe("calendarEventToJCal", () => {
  it("preserves passthroughProps inside the vcalendar output", () => {
    const event = baseCalendarEvent({ passthroughProps: CUSTOM_PROPS });
    const [, , children] = calendarEventToJCal(event);
    const vevent = (children as unknown[][]).find((c) => c[0] === "vevent");
    const veventProps = vevent![1] as VObjectProperty[];
    const keys = veventProps.map(([k]) => k.toLowerCase());

    expect(keys).toContain("x-attachment");

    expect(keys).toContain("x-custom-field");
  });
});

describe("Standard event modification", () => {
  describe("title update", () => {
    it("updates title while preserving custom props", () => {
      const event = baseCalendarEvent({
        title: "Old title",
        passthroughProps: CUSTOM_PROPS,
      });
      const updated = { ...event, title: "New title" };
      const [, props] = makeVevent(updated, updated.timezone, undefined);

      const summary = (props as VObjectProperty[]).find(
        ([k]) => k === "summary"
      );
      expect(summary?.[3]).toBe("New title");

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("time update", () => {
    it("updates dtstart/dtend while preserving custom props", () => {
      const event = baseCalendarEvent({
        start: "2024-03-16T08:00:00.000Z",
        end: "2024-03-16T09:00:00.000Z",
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(event, event.timezone, undefined);

      const dtstart = (props as VObjectProperty[]).find(
        ([k]) => k === "dtstart"
      );
      expect(dtstart).toBeDefined();

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("description update", () => {
    it("adds description while preserving custom props", () => {
      const event = baseCalendarEvent({
        description: "Updated description",
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(event, event.timezone, undefined);

      const desc = (props as VObjectProperty[]).find(
        ([k]) => k === "description"
      );
      expect(desc?.[3]).toBe("Updated description");

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("location update", () => {
    it("adds location while preserving custom props", () => {
      const event = baseCalendarEvent({
        location: "Conference Room B",
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(event, event.timezone, undefined);

      const loc = (props as VObjectProperty[]).find(([k]) => k === "location");
      expect(loc?.[3]).toBe("Conference Room B");

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("attendee update", () => {
    it("adds attendee while preserving custom props", () => {
      const event = baseCalendarEvent({
        attendee: [
          {
            cal_address: "alice@example.com",
            cn: "Alice",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ],
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(
        event,
        event.timezone,
        "organizer@example.com"
      );

      const attendees = (props as VObjectProperty[]).filter(
        ([k]) => k === "attendee"
      );
      expect(attendees.length).toBe(1);
      expect(String(attendees[0][3])).toContain("alice@example.com");

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("all-day event", () => {
    it("formats dates without time component and preserves custom props", () => {
      const event = baseCalendarEvent({
        allday: true,
        start: "2024-03-15T00:00:00.000Z",
        end: "2024-03-16T00:00:00.000Z",
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(event, event.timezone, undefined);

      const dtstart = (props as VObjectProperty[]).find(
        ([k]) => k === "dtstart"
      );
      // All-day values should be date strings (no T separator)
      expect(String(dtstart?.[3])).not.toContain("T");

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });

  describe("timezone change", () => {
    it("switches tzid param while preserving custom props", () => {
      const event = baseCalendarEvent({
        timezone: "America/New_York",
        passthroughProps: CUSTOM_PROPS,
      });
      const [, props] = makeVevent(event, "America/New_York", undefined);

      const dtstart = (props as VObjectProperty[]).find(
        ([k]) => k === "dtstart"
      );
      expect((dtstart?.[1] as Record<string, string>)?.tzid).toBe(
        "America/New_York"
      );

      const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
      expect(keys).toContain("x-attachment");
    });
  });
});

describe("Recurring event — makeVevent as master", () => {
  const recurringBase = () =>
    baseCalendarEvent({
      repetition: { freq: "weekly", byday: ["MO", "WE", "FR"], interval: 1 },
      passthroughProps: CUSTOM_PROPS,
    });

  it("includes rrule in the output", () => {
    const [, props] = makeVevent(
      recurringBase(),
      "Europe/Paris",
      undefined,
      true
    );
    const rrule = (props as VObjectProperty[]).find(([k]) => k === "rrule");
    expect(rrule).toBeDefined();
    expect((rrule?.[3] as Record<string, unknown>)?.freq).toBe("weekly");
  });

  it("preserves custom props on master vevent", () => {
    const [, props] = makeVevent(
      recurringBase(),
      "Europe/Paris",
      undefined,
      true
    );
    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
    expect(keys).toContain("x-custom-field");
  });

  it("does NOT include recurrence-id on master event", () => {
    const [, props] = makeVevent(
      recurringBase(),
      "Europe/Paris",
      undefined,
      true
    );
    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).not.toContain("recurrence-id");
  });
});

describe("Recurring event — makeVevent as override (single instance)", () => {
  const overrideBase = () =>
    baseCalendarEvent({
      recurrenceId: "2024-03-20T09:00:00",
      uid: "event-abc-uid/2024-03-20T09:00:00",
      passthroughProps: CUSTOM_PROPS,
    });

  it("preserves custom props on override vevent", () => {
    const [, props] = makeVevent(
      overrideBase(),
      "Europe/Paris",
      undefined,
      false
    );
    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
  });
});

describe("Recurring event — exdate (delete instance)", () => {
  it("adds exdate entries and preserves custom props", () => {
    const event = baseCalendarEvent({
      exdates: ["2024-03-20T09:00:00.000Z", "2024-03-27T09:00:00.000Z"],
      passthroughProps: CUSTOM_PROPS,
    });
    const [, props] = makeVevent(event, "Europe/Paris", undefined, true);

    const exdates = (props as VObjectProperty[]).filter(
      ([k]) => k === "exdate"
    );
    expect(exdates.length).toBe(2);

    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
  });
});

describe("Edge cases", () => {
  it("handles multiple custom props of the same name", () => {
    const multiAttach: VObjectProperty[] = [
      ["x-attachment", {}, "text", "file1=="],
      ["x-attachment", {}, "text", "file2=="],
    ];
    const event = parseCalendarEvent(
      baseVeventProps(multiAttach),
      {},
      MOCK_CALENDAR,
      EVENT_URL
    );
    expect(
      event.passthroughProps?.filter(([k]) => k === "x-attachment").length
    ).toBe(2);

    const updated = baseCalendarEvent({
      passthroughProps: event.passthroughProps,
    });
    const [, props] = makeVevent(updated, updated.timezone, undefined);
    const attachments = (props as VObjectProperty[]).filter(
      ([k]) => k === "x-attachment"
    );
    expect(attachments.length).toBe(2);
  });

  it("handles passthrough prop with complex params object", () => {
    const complexProp: VObjectProperty = [
      "x-complex",
      { encoding: "BASE64", fmttype: "application/pdf" },
      "binary",
      "binarydata==",
    ];
    const event = baseCalendarEvent({ passthroughProps: [complexProp] });
    const [, props] = makeVevent(event, event.timezone, undefined);

    const found = (props as VObjectProperty[]).find(([k]) => k === "x-complex");
    expect(found?.[1]).toEqual({
      encoding: "BASE64",
      fmttype: "application/pdf",
    });
    expect(found?.[3]).toBe("binarydata==");
  });

  it("round-trips without mutation: passthroughProps array is not modified", () => {
    const originalProps = [...CUSTOM_PROPS];
    const event = baseCalendarEvent({ passthroughProps: CUSTOM_PROPS });
    makeVevent(event, event.timezone, undefined);

    // Original array must be untouched
    expect(CUSTOM_PROPS).toEqual(originalProps);
  });

  it("handles event with alarm alongside passthroughProps", () => {
    const event = baseCalendarEvent({
      alarm: { trigger: "-PT15M", action: "EMAIL" },
      passthroughProps: CUSTOM_PROPS,
    });
    const [, props, subComponents] = makeVevent(
      event,
      event.timezone,
      "owner@example.com"
    );
    expect(Array.isArray(subComponents)).toBe(true);

    const keys = (props as VObjectProperty[]).map(([k]) => k.toLowerCase());
    expect(keys).toContain("x-attachment");
  });
});

describe("putEvent - passthroughProps preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("includes passthroughProps in the PUT body", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    const eventWithPassthrough = {
      ...mockEvent,
      passthroughProps: [
        ["x-attachment", {}, "text", "data:application/pdf;base64,abc123=="],
      ],
    } as CalendarEvent;

    await putEvent(eventWithPassthrough);

    const callArgs = (api as unknown as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    const veventProps = body[2][0][1];

    expect(veventProps).toContainEqual([
      "x-attachment",
      {},
      "text",
      "data:application/pdf;base64,abc123==",
    ]);
  });

  it("sends clean body without passthroughProps when none exist", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    await putEvent({ ...mockEvent, passthroughProps: [] } as CalendarEvent);

    const callArgs = (api as unknown as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    const veventProps = body[2][0][1] as [string, ...unknown[]][];

    const xProps = veventProps.filter(([k]) => k.startsWith("x-attachment"));
    expect(xProps).toHaveLength(0);
  });
});

describe("putEventWithOverrides - passthroughProps isolation", () => {
  const icsWithPassthrough = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Master
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Override
X-ATTACHMENT:data:application/pdf;base64,abc123==
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({
      text: jest.fn().mockResolvedValue(icsWithPassthrough),
    });
    (api as jest.Mock).mockResolvedValue({ ok: true });
  });

  it("preserves X-ATTACHMENT on the updated instance in the PUT body", async () => {
    const updatedInstance = {
      ...mockEvent,
      title: "Override updated",
      recurrenceId: "20240202T100000Z",
      start: "2024-02-02T10:00:00Z",
      end: "2024-02-02T11:00:00Z",
      passthroughProps: [
        ["x-attachment", {}, "text", "data:application/pdf;base64,abc123=="],
      ] as VObjectProperty[],
    } as CalendarEvent;

    await putEventWithOverrides(updatedInstance);

    const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
    const vevents = body[2].filter(([n]: any) => n === "vevent");
    const override = vevents.find(([, props]: any) =>
      props.some(([k]: any) => k === "recurrence-id")
    );

    const attachment = override[1].find(([k]: any) => k === "x-attachment");
    expect(attachment).toBeDefined();
    expect(attachment[3]).toBe("data:application/pdf;base64,abc123==");
  });

  it("does not inject instance passthroughProps into the master vevent", async () => {
    const updatedInstance = {
      ...mockEvent,
      title: "Override updated",
      recurrenceId: "20240202T100000Z",
      start: "2024-02-02T10:00:00Z",
      end: "2024-02-02T11:00:00Z",
      passthroughProps: [
        ["x-attachment", {}, "text", "data:application/pdf;base64,abc123=="],
      ] as VObjectProperty[],
    } as CalendarEvent;

    await putEventWithOverrides(updatedInstance);

    const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
    const vevents = body[2].filter(([n]: any) => n === "vevent");
    const master = vevents.find(([, props]: any) =>
      props.every(([k]: any) => k !== "recurrence-id")
    );

    const attachment = master[1].find(([k]: any) => k === "x-attachment");
    expect(attachment).toBeUndefined();
  });

  it("preserves raw X-ATTACHMENT on untouched instances from the ICS", async () => {
    const icsWithTwoOverrides = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Master
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Override A
X-ATTACHMENT:data:application/pdf;base64,aaa==
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240203T100000Z
DTSTART:20240203T100000Z
DTEND:20240203T110000Z
SUMMARY:Override B
X-ATTACHMENT:data:application/pdf;base64,bbb==
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

    (api.get as jest.Mock).mockResolvedValueOnce({
      text: jest.fn().mockResolvedValue(icsWithTwoOverrides),
    });

    // Only updating Override A — Override B should be untouched
    const updatedInstance = {
      ...mockEvent,
      title: "Override A updated",
      recurrenceId: "20240202T100000Z",
      start: "2024-02-02T10:00:00Z",
      end: "2024-02-02T11:00:00Z",
      passthroughProps: [
        ["x-attachment", {}, "text", "data:application/pdf;base64,aaa=="],
      ] as VObjectProperty[],
    } as CalendarEvent;

    await putEventWithOverrides(updatedInstance);

    const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
    const vevents = body[2].filter(([n]: any) => n === "vevent");

    const overrideB = vevents.find(([, props]: any) =>
      props.some(
        ([k, , , v]: any) =>
          k === "recurrence-id" && v === "2024-02-03T10:00:00Z"
      )
    );

    // Override B was never touched — its raw jCal props come straight from the ICS
    const attachmentB = overrideB[1].find(([k]: any) => k === "x-attachment");
    expect(attachmentB).toBeDefined();
    expect(attachmentB[3]).toBe("data:application/pdf;base64,bbb==");
  });

  it("does not bleed X-ATTACHMENT from one instance to another in the same PUT", async () => {
    const icsWithTwoOverrides = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Master
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Override A
X-ATTACHMENT:data:application/pdf;base64,aaa==
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240203T100000Z
DTSTART:20240203T100000Z
DTEND:20240203T110000Z
SUMMARY:Override B - no attachment
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

    (api.get as jest.Mock).mockResolvedValueOnce({
      text: jest.fn().mockResolvedValue(icsWithTwoOverrides),
    });

    const updatedInstance = {
      ...mockEvent,
      title: "Override A updated",
      recurrenceId: "20240202T100000Z",
      start: "2024-02-02T10:00:00Z",
      end: "2024-02-02T11:00:00Z",
      passthroughProps: [
        ["x-attachment", {}, "text", "data:application/pdf;base64,aaa=="],
      ] as VObjectProperty[],
    } as CalendarEvent;

    await putEventWithOverrides(updatedInstance);

    const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
    const vevents = body[2].filter(([n]: any) => n === "vevent");

    const overrideB = vevents.find(([, props]: any) =>
      props.some(
        ([k, , , v]: any) =>
          k === "recurrence-id" && v === "2024-02-03T10:00:00Z"
      )
    );

    const attachmentB = overrideB[1].find(([k]: any) => k === "x-attachment");
    expect(attachmentB).toBeUndefined();
  });
});
