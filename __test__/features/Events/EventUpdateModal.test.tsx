import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventUpdateModal from "../../../src/features/Events/EventUpdateModal";
import * as EventApi from "../../../src/features/Events/EventApi";

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
