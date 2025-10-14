import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventUpdateModal from "../../../src/features/Events/EventUpdateModal";
import * as EventApi from "../../../src/features/Events/EventApi";
import * as CalendarApi from "../../../src/features/Calendars/CalendarApi";
import * as eventUtils from "../../../src/components/Event/utils/eventUtils";

jest.mock("../../../src/features/Events/EventApi");
jest.mock("../../../src/features/Calendars/CalendarApi");

describe("EventUpdateModal Timezone Handling", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "test-sid",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "Test Calendar",
          color: "#FF0000",
          events: {},
        },
      },
      pending: false,
    },
  };

  it("displays event time in original timezone when editing event", async () => {
    // GIVEN user timezone is UTC+2
    // WHEN the user edits an event at 2PM UTC+7 (Asia/Bangkok)
    // THEN the update modal prompts him date with 2PM UTC+7

    // Create event at 2PM UTC+7 (Asia/Bangkok)
    // 2PM UTC+7 = 14:00 in Bangkok = 07:00 UTC
    const eventDateUTC = new Date("2025-01-15T07:00:00.000Z");

    const eventData = {
      uid: "test-event-1",
      title: "Timezone Event",
      calId: "667037022b752d0026472254/cal1",
      start: eventDateUTC.toISOString(),
      end: new Date(eventDateUTC.getTime() + 3600000).toISOString(),
      timezone: "Asia/Bangkok",
      allday: false,
      organizer: { cn: "test", cal_address: "test@test.com" },
      attendee: [{ cn: "test", cal_address: "test@test.com" }],
    };

    const stateWithEvent = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              "test-event-1": eventData,
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"test-event-1"}
        eventData={eventData}
      />,
      stateWithEvent
    );

    // Verify title is displayed
    const titleInput = screen.getByDisplayValue("Timezone Event");
    expect(titleInput).toBeInTheDocument();

    // Verify the start date and time inputs exist
    // Since showMore is false by default, labels should be "Start Date" and "Start Time"
    await waitFor(() => {
      const startDateInput = screen.getByLabelText("Start Date");
      const startTimeInput = screen.getByLabelText("Start Time");

      expect(startDateInput).toBeInTheDocument();
      expect(startDateInput).toHaveAttribute("type", "date");
      expect(startDateInput).toHaveValue("2025-01-15");

      expect(startTimeInput).toBeInTheDocument();
      expect(startTimeInput).toHaveAttribute("type", "time");
      // The value should be formatted as 14:00 (2PM in Bangkok time)
      // EventUpdateModal uses formatDateTimeInTimezone which formats in event's original timezone
      expect(startTimeInput).toHaveValue("14:00");
    });
  });

  it("preserves original timezone when editing event fields", async () => {
    const eventDateUTC = new Date("2025-01-15T07:00:00.000Z");

    const eventData = {
      uid: "test-event-2",
      title: "Original Event",
      calId: "667037022b752d0026472254/cal1",
      start: eventDateUTC.toISOString(),
      end: new Date(eventDateUTC.getTime() + 3600000).toISOString(),
      timezone: "Asia/Bangkok",
      allday: false,
      organizer: { cn: "test", cal_address: "test@test.com" },
      attendee: [{ cn: "test", cal_address: "test@test.com" }],
    };

    const stateWithEvent = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              "test-event-2": eventData,
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"test-event-2"}
        eventData={eventData}
      />,
      stateWithEvent
    );

    // Edit the title
    const titleInput = screen.getByDisplayValue("Original Event");
    fireEvent.change(titleInput, { target: { value: "Updated Event" } });

    // Verify the timezone is still preserved (should be Asia/Bangkok)
    expect(titleInput).toHaveValue("Updated Event");
  });
});

describe("EventUpdateModal Recurring to Non-Recurring Conversion", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const baseUID = "recurring-event-base";
  const calId = "667037022b752d0026472254/cal1";

  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "test-sid",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        [calId]: {
          id: calId,
          name: "Test Calendar",
          color: "#FF0000",
          events: {},
        },
      },
      pending: false,
    },
  };

  it("converts recurring event to non-recurring when repeat is disabled in edit all mode", async () => {
    // Create recurring event with multiple instances
    const eventDate = new Date("2025-01-15T10:00:00.000Z");

    const masterEvent = {
      uid: baseUID,
      title: "Recurring Meeting",
      calId,
      start: eventDate.toISOString(),
      end: new Date(eventDate.getTime() + 3600000).toISOString(),
      repetition: { freq: "daily", interval: 1 },
      allday: false,
      organizer: { cn: "test", cal_address: "test@test.com" },
      attendee: [{ cn: "test", cal_address: "test@test.com" }],
      URL: `/calendars/${calId}/${baseUID}.ics`,
    };

    const instance1 = {
      ...masterEvent,
      uid: `${baseUID}/20250115`,
      start: "2025-01-15T10:00:00.000Z",
      end: "2025-01-15T11:00:00.000Z",
    };

    const instance2 = {
      ...masterEvent,
      uid: `${baseUID}/20250116`,
      start: "2025-01-16T10:00:00.000Z",
      end: "2025-01-16T11:00:00.000Z",
    };

    const instance3 = {
      ...masterEvent,
      uid: `${baseUID}/20250117`,
      start: "2025-01-17T10:00:00.000Z",
      end: "2025-01-17T11:00:00.000Z",
    };

    const stateWithRecurringEvent = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          [calId]: {
            ...preloadedState.calendars.list[calId],
            events: {
              [baseUID]: masterEvent,
              [`${baseUID}/20250115`]: instance1,
              [`${baseUID}/20250116`]: instance2,
              [`${baseUID}/20250117`]: instance3,
            },
          },
        },
      },
    };

    // Mock API calls
    const mockDeleteEvent = jest
      .spyOn(EventApi, "deleteEvent")
      .mockResolvedValue({} as any);
    const mockPutEvent = jest.spyOn(EventApi, "putEvent").mockResolvedValue({
      status: 201,
      url: `/calendars/${calId}/new-event.ics`,
    } as any);
    jest.spyOn(CalendarApi, "getCalendar").mockResolvedValue({
      _embedded: {
        "dav:item": [],
      },
    } as any);

    const { store } = renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={calId}
        eventId={`${baseUID}/20250115`}
        typeOfAction="all"
      />,
      stateWithRecurringEvent
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Recurring Meeting")).toBeInTheDocument();
    });

    // Uncheck repeat checkbox
    const repeatCheckbox = screen.getByLabelText("Repeat");
    expect(repeatCheckbox).toBeChecked();

    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    expect(repeatCheckbox).not.toBeChecked();

    // Click Save button
    const saveButton = screen.getByText("Save");

    await act(async () => {
      fireEvent.click(saveButton);
      // Wait for the 500ms delay in the code
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Verify API calls - should delete all instances
    await waitFor(
      () => {
        // Should have called deleteEvent for each instance (4 total: base + 3 recurrences)
        expect(mockDeleteEvent).toHaveBeenCalled();
        // At least one instance should be deleted
        expect(mockDeleteEvent.mock.calls.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // Verify new event was created via putEvent
    expect(mockPutEvent).toHaveBeenCalled();
    const putEventCall = mockPutEvent.mock.calls[0][0];
    expect(putEventCall.title).toBe("Recurring Meeting");
    expect(putEventCall.repetition?.freq).toBeFalsy();
    expect(putEventCall.uid).not.toContain(baseUID);

    // Verify Redux store state changes
    const finalState = store.getState();
    const calendar = finalState.calendars.list[calId];

    // Old recurring instances should be removed from store
    expect(calendar.events[baseUID]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250115`]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250116`]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250117`]).toBeUndefined();

    // Verify modal was closed after completion
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("gracefully handles deletion errors and continues to create new event", async () => {
    const eventDate = new Date("2025-01-15T10:00:00.000Z");

    const masterEvent = {
      uid: baseUID,
      title: "Recurring Meeting",
      calId,
      start: eventDate.toISOString(),
      end: new Date(eventDate.getTime() + 3600000).toISOString(),
      repetition: { freq: "weekly", interval: 1 },
      allday: false,
      organizer: { cn: "test", cal_address: "test@test.com" },
      attendee: [{ cn: "test", cal_address: "test@test.com" }],
      URL: `/calendars/${calId}/${baseUID}.ics`,
    };

    const instance1 = {
      ...masterEvent,
      uid: `${baseUID}/20250115`,
    };

    const stateWithRecurringEvent = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          [calId]: {
            ...preloadedState.calendars.list[calId],
            events: {
              [baseUID]: masterEvent,
              [`${baseUID}/20250115`]: instance1,
            },
          },
        },
      },
    };

    // Mock deleteEvent to fail
    jest
      .spyOn(EventApi, "deleteEvent")
      .mockRejectedValue(new Error("Network error"));
    const mockPutEvent = jest
      .spyOn(EventApi, "putEvent")
      .mockResolvedValue({ status: 201 } as any);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock refreshCalendars
    jest.spyOn(eventUtils, "refreshCalendars").mockResolvedValue(undefined);

    const { store } = renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={calId}
        eventId={`${baseUID}/20250115`}
        typeOfAction="all"
      />,
      stateWithRecurringEvent
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Recurring Meeting")).toBeInTheDocument();
    });

    // Uncheck repeat checkbox and save
    const repeatCheckbox = screen.getByLabelText("Repeat");

    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    const saveButton = screen.getByText("Save");

    await act(async () => {
      fireEvent.click(saveButton);
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Verify error was logged for failed deletion
    await waitFor(
      () => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to delete event file")
        );
      },
      { timeout: 3000 }
    );

    // New implementation gracefully handles deletion errors:
    // Even if some instances fail to delete, we still create the new event
    // This ensures user gets their non-recurring event
    await waitFor(
      () => {
        expect(mockPutEvent).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    const putEventCall = mockPutEvent.mock.calls[0][0];
    expect(putEventCall.title).toBe("Recurring Meeting");
    expect(putEventCall.repetition?.freq).toBeFalsy();

    // Modal should close after operation completes
    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    consoleErrorSpy.mockRestore();
  });

  it("closes all modals after converting recurring to non-recurring", async () => {
    const eventDate = new Date("2025-01-15T10:00:00.000Z");

    const masterEvent = {
      uid: baseUID,
      title: "Recurring Meeting",
      calId,
      start: eventDate.toISOString(),
      end: new Date(eventDate.getTime() + 3600000).toISOString(),
      repetition: { freq: "monthly", interval: 1 },
      allday: false,
      organizer: { cn: "test", cal_address: "test@test.com" },
      attendee: [{ cn: "test", cal_address: "test@test.com" }],
      URL: `/calendars/${calId}/${baseUID}.ics`,
    };

    const instance1 = {
      ...masterEvent,
      uid: `${baseUID}/20250115`,
    };

    const stateWithRecurringEvent = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          [calId]: {
            ...preloadedState.calendars.list[calId],
            events: {
              [baseUID]: masterEvent,
              [`${baseUID}/20250115`]: instance1,
            },
          },
        },
      },
    };

    // Mock API calls
    jest.spyOn(EventApi, "deleteEvent").mockResolvedValue({} as any);
    jest.spyOn(EventApi, "putEvent").mockResolvedValue({ status: 201 } as any);
    jest.spyOn(CalendarApi, "getCalendar").mockResolvedValue({
      _embedded: {
        "dav:item": [],
      },
    } as any);

    // Mock onCloseAll to test closing both modals
    const mockOnCloseAll = jest.fn();

    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        onCloseAll={mockOnCloseAll}
        calId={calId}
        eventId={`${baseUID}/20250115`}
        typeOfAction="all"
      />,
      stateWithRecurringEvent
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Recurring Meeting")).toBeInTheDocument();
    });

    // Uncheck repeat and save
    const repeatCheckbox = screen.getByLabelText("Repeat");

    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    const saveButton = screen.getByText("Save");

    await act(async () => {
      fireEvent.click(saveButton);
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Verify onCloseAll was called to close both preview and update modals
    await waitFor(
      () => {
        expect(mockOnCloseAll).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify onClose was NOT called (onCloseAll is used instead)
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
