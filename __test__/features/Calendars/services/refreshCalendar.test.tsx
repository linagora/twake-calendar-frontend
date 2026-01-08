import { configureStore } from "@reduxjs/toolkit";
import reducer from "../../../../src/features/Calendars/CalendarSlice";
import {
  refreshCalendarWithSyncToken,
  SyncTokenUpdates,
} from "../../../../src/features/Calendars/services/refreshCalendar";
import { Calendar } from "../../../../src/features/Calendars/CalendarTypes";
import { CalendarEvent } from "../../../../src/features/Events/EventsTypes";
import * as fetchSyncTokenChanges from "../../../../src/features/Calendars/api/fetchSyncTokenChanges";
import * as EventApi from "../../../../src/features/Events/EventApi";

jest.mock("../../../../src/features/Calendars/api/fetchSyncTokenChanges");
jest.mock("../../../../src/features/Events/EventApi");

describe("refreshCalendarWithSyncToken", () => {
  const mockCalendar: Calendar = {
    id: "user1/cal1",
    name: "Test Calendar",
    link: "/calendars/user1/cal1.json",
    owner: "Test User",
    ownerEmails: ["test@example.com"],
    description: "Test calendar description",
    delegated: false,
    color: { light: "#006BD8", dark: "#FFF" },
    visibility: "private",
    events: {
      event1: {
        uid: "event1",
        title: "Existing Event",
        start: "2024-01-01T10:00:00",
        end: "2024-01-01T11:00:00",
        calId: "user1/cal1",
        URL: "/calendars/user1/cal1/event1.ics",
      } as CalendarEvent,
    },
    syncToken: "sync-token-123",
  };

  const calendarRange = {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31"),
  };

  const storeFactory = () =>
    configureStore({
      reducer: { calendars: reducer },
      preloadedState: {
        calendars: {
          list: { [mockCalendar.id]: mockCalendar },
          templist: {},
          pending: false,
          error: null,
        },
      },
    });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return early if calendar has no syncToken", async () => {
    const calendarWithoutToken = { ...mockCalendar, syncToken: undefined };
    const store = storeFactory();

    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: calendarWithoutToken,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    expect(result.payload).toEqual({
      calId: calendarWithoutToken.id,
      deletedEvents: [],
      createdOrUpdatedEvents: [],
      calType: undefined,
    });
    expect(fetchSyncTokenChanges.fetchSyncTokenChanges).not.toHaveBeenCalled();
  });

  it("should handle deleted events (status 404)", async () => {
    const mockSyncResponse = {
      "sync-token": "new-sync-token-456",
      _embedded: {
        "dav:item": [
          {
            status: 404,
            _links: {
              self: { href: "/calendars/user1/cal1/deleted-event.ics" },
            },
          },
        ],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    expect(result.payload).toMatchObject({
      calId: mockCalendar.id,
      deletedEvents: ["deleted-event"],
      createdOrUpdatedEvents: [],
      syncToken: "new-sync-token-456",
    });
  });

  it("should handle created/updated events (status 200)", async () => {
    const mockSyncResponse = {
      "sync-token": "new-sync-token-789",
      _embedded: {
        "dav:item": [
          {
            status: 200,
            _links: {
              self: { href: "/calendars/user1/cal1/new-event.ics" },
            },
          },
        ],
      },
    };

    const mockEventData = {
      data: [
        null,
        null,
        [
          [
            "vevent",
            [
              ["uid", {}, "text", "new-event"],
              ["summary", {}, "text", "New Event Title"],
              ["dtstart", {}, "date-time", "2024-01-15T10:00:00Z"],
              ["dtend", {}, "date-time", "2024-01-15T11:00:00Z"],
            ],
            [],
          ],
        ],
      ],
      _links: {
        self: { href: "/calendars/user1/cal1/new-event.ics" },
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);
    (EventApi.reportEvent as jest.Mock).mockResolvedValue(mockEventData);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    if (result.type === "calendars/refreshWithSyncToken/fulfilled") {
      const payload = result.payload as SyncTokenUpdates;
      expect(payload?.calId).toBe(mockCalendar.id);
      expect(payload?.createdOrUpdatedEvents).toHaveLength(1);
      expect(payload?.createdOrUpdatedEvents[0].uid).toBe("new-event");
      expect(payload?.syncToken).toBe("new-sync-token-789");
    }
  });

  it("should handle both deletions and updates in same response", async () => {
    const mockSyncResponse = {
      "sync-token": "new-sync-token-mixed",
      _embedded: {
        "dav:item": [
          {
            status: 404,
            _links: {
              self: { href: "/calendars/user1/cal1/deleted-event.ics" },
            },
          },
          {
            status: 200,
            _links: {
              self: { href: "/calendars/user1/cal1/updated-event.ics" },
            },
          },
        ],
      },
    };

    const mockEventData = {
      data: [
        null,
        null,
        [
          [
            "vevent",
            [
              ["uid", {}, "text", "updated-event"],
              ["summary", {}, "text", "Updated Event"],
              ["dtstart", {}, "date-time", "2024-01-20T10:00:00Z"],
              ["dtend", {}, "date-time", "2024-01-20T11:00:00Z"],
            ],
            [],
          ],
        ],
      ],
      _links: {
        self: { href: "/calendars/user1/cal1/updated-event.ics" },
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);
    (EventApi.reportEvent as jest.Mock).mockResolvedValue(mockEventData);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    if (result.type === "calendars/refreshWithSyncToken/fulfilled") {
      const payload = result.payload as SyncTokenUpdates;
      expect(payload?.deletedEvents).toEqual([
        "deleted-event",
        "updated-event",
      ]);
      expect(payload?.createdOrUpdatedEvents).toHaveLength(1);
      expect(payload?.createdOrUpdatedEvents[0].uid).toBe("updated-event");
    }
  });

  it("should reject with SYNC_TOKEN_INVALID error on 410 status", async () => {
    const mockSyncResponse = {
      _embedded: {
        "dav:item": [
          {
            status: 410,
            _links: {
              self: { href: "/calendars/user1/cal1/some-event.ics" },
            },
          },
        ],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/rejected");
    expect(result.payload).toMatchObject({
      message: expect.stringContaining("SYNC_TOKEN_INVALID"),
    });
  });

  it("should handle API errors gracefully", async () => {
    const mockError = new Error("Network error");
    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockRejectedValue(mockError);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/rejected");
    expect(result.payload).toMatchObject({
      message: expect.stringContaining("Network error"),
    });
  });

  it("should handle malformed sync response", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      // Missing _embedded field
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    expect(result.payload).toMatchObject({
      calId: mockCalendar.id,
      deletedEvents: [],
      createdOrUpdatedEvents: [],
      syncToken: "new-token",
    });
  });

  it("should handle events without href in _links", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": [
          {
            status: 200,
            _links: {
              self: {}, // Missing href
            },
          },
        ],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    if (result.type === "calendars/refreshWithSyncToken/fulfilled") {
      const payload = result.payload as SyncTokenUpdates;
      expect(payload?.createdOrUpdatedEvents).toHaveLength(0);
    }
  });

  it("should continue processing other events if one fails to fetch", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": [
          {
            status: 200,
            _links: {
              self: { href: "/calendars/user1/cal1/failing-event.ics" },
            },
          },
          {
            status: 200,
            _links: {
              self: { href: "/calendars/user1/cal1/success-event.ics" },
            },
          },
        ],
      },
    };

    const mockEventData = {
      data: [
        null,
        null,
        [
          [
            "vevent",
            [
              ["uid", {}, "text", "success-event"],
              ["summary", {}, "text", "Success Event"],
              ["dtstart", {}, "date-time", "2024-01-20T10:00:00Z"],
              ["dtend", {}, "date-time", "2024-01-20T11:00:00Z"],
            ],
            [],
          ],
        ],
      ],
      _links: {
        self: { href: "/calendars/user1/cal1/success-event.ics" },
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);
    (EventApi.reportEvent as jest.Mock)
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce(mockEventData);

    const store = storeFactory();
    const result = await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    expect(result.type).toBe("calendars/refreshWithSyncToken/fulfilled");
    if (result.type === "calendars/refreshWithSyncToken/fulfilled") {
      const payload = result.payload as SyncTokenUpdates;
      expect(payload?.createdOrUpdatedEvents).toHaveLength(1);
      expect(payload?.createdOrUpdatedEvents[0].uid).toBe("success-event");
    }
  });

  it("should update calendar state with new sync token", async () => {
    const mockSyncResponse = {
      "sync-token": "new-sync-token-state-test",
      _embedded: {
        "dav:item": [],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    const state = store.getState().calendars;
    expect(state.list[mockCalendar.id].syncToken).toBe(
      "new-sync-token-state-test"
    );
  });

  it("should remove deleted events from calendar state", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": [
          {
            status: 404,
            _links: {
              self: { href: "/calendars/user1/cal1/event1.ics" },
            },
          },
        ],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = storeFactory();
    await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    const state = store.getState().calendars;
    expect(state.list[mockCalendar.id].events["event1"]).toBeUndefined();
  });

  it("should add new events to calendar state", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": [
          {
            status: 200,
            _links: {
              self: { href: "/calendars/user1/cal1/new-event.ics" },
            },
          },
        ],
      },
    };

    const mockEventData = {
      data: [
        null,
        null,
        [
          [
            "vevent",
            [
              ["uid", {}, "text", "new-event"],
              ["summary", {}, "text", "New Event"],
              ["dtstart", {}, "date-time", "2024-01-25T10:00:00Z"],
              ["dtend", {}, "date-time", "2024-01-25T11:00:00Z"],
            ],
            [],
          ],
        ],
      ],
      _links: {
        self: { href: "/calendars/user1/cal1/new-event.ics" },
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);
    (EventApi.reportEvent as jest.Mock).mockResolvedValue(mockEventData);

    const store = storeFactory();
    await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
      })
    );

    const state = store.getState().calendars;
    expect(state.list[mockCalendar.id].events["new-event"]).toBeDefined();
    expect(state.list[mockCalendar.id].events["new-event"].title).toBe(
      "New Event"
    );
  });

  it("should handle recurring events with base UID matching", async () => {
    const calendarWithRecurringEvent = {
      ...mockCalendar,
      events: {
        "recurring-base": {
          uid: "recurring-base",
          title: "Recurring Event",
          start: "2024-01-01T10:00:00",
          end: "2024-01-01T11:00:00",
          calId: "user1/cal1",
          URL: "/calendars/user1/cal1/recurring-base.ics",
        } as CalendarEvent,
        "recurring-base/20240108": {
          uid: "recurring-base/20240108",
          title: "Recurring Event Instance",
          start: "2024-01-08T10:00:00",
          end: "2024-01-08T11:00:00",
          calId: "user1/cal1",
          URL: "/calendars/user1/cal1/recurring-base.ics",
        } as CalendarEvent,
      },
    };

    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": [
          {
            status: 404,
            _links: {
              self: { href: "/calendars/user1/cal1/recurring-base.ics" },
            },
          },
        ],
      },
    };

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    const store = configureStore({
      reducer: { calendars: reducer },
      preloadedState: {
        calendars: {
          list: { [calendarWithRecurringEvent.id]: calendarWithRecurringEvent },
          templist: {},
          pending: false,
          error: null,
        },
      },
    });

    await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: calendarWithRecurringEvent,
        calendarRange,
      })
    );

    const state = store.getState().calendars;
    // Both base event and instance should be removed
    expect(
      state.list[calendarWithRecurringEvent.id].events["recurring-base"]
    ).toBeUndefined();
    expect(
      state.list[calendarWithRecurringEvent.id].events[
        "recurring-base/20240108"
      ]
    ).toBeUndefined();
  });

  it("should respect maxConcurrency parameter", async () => {
    const mockSyncResponse = {
      "sync-token": "new-token",
      _embedded: {
        "dav:item": Array.from({ length: 20 }, (_, i) => ({
          status: 200,
          _links: {
            self: { href: `/calendars/user1/cal1/event${i}.ics` },
          },
        })),
      },
    };

    const mockEventData = (uid: string) => ({
      data: [
        null,
        null,
        [
          [
            "vevent",
            [
              ["uid", {}, "text", uid],
              ["summary", {}, "text", `Event ${uid}`],
              ["dtstart", {}, "date-time", "2024-01-20T10:00:00Z"],
              ["dtend", {}, "date-time", "2024-01-20T11:00:00Z"],
            ],
            [],
          ],
        ],
      ],
      _links: {
        self: { href: `/calendars/user1/cal1/${uid}.ics` },
      },
    });

    (
      fetchSyncTokenChanges.fetchSyncTokenChanges as jest.Mock
    ).mockResolvedValue(mockSyncResponse);

    let concurrentCalls = 0;
    let maxConcurrent = 0;

    (EventApi.reportEvent as jest.Mock).mockImplementation(async () => {
      concurrentCalls++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCalls--;
      return mockEventData("test-event");
    });

    const store = storeFactory();
    await store.dispatch(
      refreshCalendarWithSyncToken({
        calendar: mockCalendar,
        calendarRange,
        maxConcurrency: 5,
      })
    );

    // Max concurrent should not exceed 5
    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });
});
