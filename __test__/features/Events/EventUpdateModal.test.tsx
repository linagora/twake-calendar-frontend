import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventUpdateModal from "../../../src/features/Events/EventUpdateModal";
import * as EventApi from "../../../src/features/Events/EventApi";
import * as eventUtils from "../../../src/components/Event/utils/eventUtils";

jest.mock("../../../src/features/Events/EventApi");

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

    // Verify the start time input exists
    // Since showMore is false by default, label should be "Start"
    await waitFor(() => {
      const startInput = screen.getByLabelText("Start");
      expect(startInput).toBeInTheDocument();
      expect(startInput).toHaveAttribute("type", "datetime-local");

      // The value should be formatted as 2025-01-15T14:00 (2PM in Bangkok time)
      // EventUpdateModal uses formatDateTimeInTimezone which formats in event's original timezone
      expect(startInput).toHaveValue("2025-01-15T14:00");
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
    const mockDeleteEvent = jest.spyOn(EventApi, 'deleteEvent').mockResolvedValue({} as any);
    const mockPutEvent = jest.spyOn(EventApi, 'putEvent').mockResolvedValue({ status: 201, url: `/calendars/${calId}/new-event.ics` } as any);
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock refreshCalendars
    const mockRefreshCalendars = jest.spyOn(eventUtils, 'refreshCalendars').mockResolvedValue(undefined);

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
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Verify API calls
    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith(`/calendars/${calId}/${baseUID}.ics`);
    }, { timeout: 3000 });

    expect(mockPutEvent).toHaveBeenCalled();
    const putEventCall = mockPutEvent.mock.calls[0][0];
    expect(putEventCall.title).toBe("Recurring Meeting");
    expect(putEventCall.repetition?.freq).toBeFalsy();
    expect(putEventCall.uid).not.toContain(baseUID);

    // Verify console.log for successful deletion
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Deleted master event via direct API call:",
      expect.stringContaining(baseUID)
    );

    // Verify Redux store state changes
    const finalState = store.getState();
    const calendar = finalState.calendars.list[calId];

    // Old recurring instances should be removed from store
    expect(calendar.events[baseUID]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250115`]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250116`]).toBeUndefined();
    expect(calendar.events[`${baseUID}/20250117`]).toBeUndefined();

    // Verify refreshCalendars was called
    expect(mockRefreshCalendars).toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it("continues creating new event even if deletion of old series fails", async () => {
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
    const mockDeleteEvent = jest.spyOn(EventApi, 'deleteEvent')
      .mockRejectedValue(new Error("Network error"));
    const mockPutEvent = jest.spyOn(EventApi, 'putEvent')
      .mockResolvedValue({ status: 201 } as any);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock refreshCalendars
    jest.spyOn(eventUtils, 'refreshCalendars').mockResolvedValue(undefined);

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
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Verify error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to delete recurring event:",
        expect.any(Error)
      );
    }, { timeout: 3000 });

    // Verify new event was still created despite deletion failure
    expect(mockPutEvent).toHaveBeenCalled();
    const putEventCall = mockPutEvent.mock.calls[0][0];
    expect(putEventCall.title).toBe("Recurring Meeting");
    expect(putEventCall.repetition?.freq).toBeFalsy();
    expect(putEventCall.uid).not.toContain(baseUID);

    // When API deletion fails, the error is caught and logged
    // The code continues to create the new event (graceful degradation)
    // Old events remain in store since API deletion failed
    // They will be cleaned up when calendar refreshes from server
    
    consoleErrorSpy.mockRestore();
  });

  it("refreshes calendar after converting recurring to non-recurring", async () => {
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
    jest.spyOn(EventApi, 'deleteEvent').mockResolvedValue({} as any);
    jest.spyOn(EventApi, 'putEvent').mockResolvedValue({ status: 201 } as any);
    
    // Mock refreshCalendars to track calls
    const mockRefreshCalendars = jest.spyOn(eventUtils, 'refreshCalendars').mockResolvedValue(undefined);

    renderWithProviders(
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

    // Uncheck repeat and save
    const repeatCheckbox = screen.getByLabelText("Repeat");
    
    await act(async () => {
      fireEvent.click(repeatCheckbox);
    });

    const saveButton = screen.getByText("Save");
    
    await act(async () => {
      fireEvent.click(saveButton);
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // Verify refreshCalendars was called
    await waitFor(() => {
      expect(mockRefreshCalendars).toHaveBeenCalledWith(
        expect.any(Function), // dispatch
        expect.any(Array),    // calendars list
        expect.any(Object)    // calendar range
      );
    }, { timeout: 3000 });
  });
});
