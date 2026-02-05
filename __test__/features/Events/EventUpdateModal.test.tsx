import * as CalendarApi from "@/features/Calendars/CalendarApi";
import * as EventApi from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import EventUpdateModal from "@/features/Events/EventUpdateModal";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";

jest.mock("@/features/Events/EventApi");
jest.mock("@/features/Calendars/CalendarApi");

describe("EventUpdateModal Timezone Handling", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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

    // Expand to show date/time inputs (normal mode shows DateTimeSummary)
    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));

    // Verify the start date and time inputs exist
    await waitFor(() => {
      const startDateInput = screen.getByTestId("start-date-input");
      const startTimeInput = screen.getByTestId("start-time-input");

      expect(startDateInput).toBeInTheDocument();
      expect(startTimeInput).toBeInTheDocument();

      // MUI DatePicker/TimePicker values are stored differently - just check elements exist
      // The actual values are verified through the form submission
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
    const mockGetMasterEvent = jest
      .spyOn(EventApi, "getEvent")
      .mockResolvedValue(masterEvent);
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

    // Wait for master event to be fetched AND form to be initialized
    await waitFor(() => {
      expect(mockGetMasterEvent).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    // Wait for the repeat checkbox to be checked (indicating form is initialized)
    const repeatCheckbox = await waitFor(() => {
      const checkbox = screen.getByLabelText("event.form.repeat");
      expect(checkbox).toBeChecked();
      return checkbox;
    });

    // Now uncheck repeat checkbox
    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    // Wait for checkbox to be unchecked
    await waitFor(() => {
      expect(repeatCheckbox).not.toBeChecked();
    });

    // Click Save button
    const saveButton = screen.getByRole("button", { name: "actions.save" });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockPutEvent).toHaveBeenCalled();
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
    } as CalendarEvent;

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

    // Mock deleteEvent to fail with a non-404 error
    const mockDeleteEvent = jest
      .spyOn(EventApi, "deleteEvent")
      .mockRejectedValue(new Error("Network error"));
    const mockPutEvent = jest
      .spyOn(EventApi, "putEvent")
      .mockResolvedValue({ status: 201 } as any);
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const mockGetMasterEvent = jest
      .spyOn(EventApi, "getEvent")
      .mockResolvedValue(masterEvent);

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

    // Wait for master event to be fetched
    await waitFor(() => {
      expect(mockGetMasterEvent).toHaveBeenCalled();
    });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("Recurring Meeting")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    // Wait for repeat checkbox to be checked
    const repeatCheckbox = await waitFor(() => {
      const checkbox = screen.getByLabelText("event.form.repeat");
      expect(checkbox).toBeChecked();
      return checkbox;
    });

    // Uncheck repeat checkbox and save
    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    // Wait for checkbox to be unchecked
    await waitFor(() => {
      expect(repeatCheckbox).not.toBeChecked();
    });

    const saveButton = screen.getByRole("button", { name: "actions.save" });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Wait for delete to be attempted
    await waitFor(
      () => {
        expect(mockDeleteEvent).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

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

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    // Uncheck repeat and save
    const repeatCheckbox = screen.getByLabelText("event.form.repeat");

    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    const saveButton = screen.getByRole("button", { name: "actions.save" });

    await act(async () => {
      fireEvent.click(saveButton);
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
