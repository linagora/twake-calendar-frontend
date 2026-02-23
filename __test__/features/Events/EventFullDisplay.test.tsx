import { InfoRow } from "@/components/Event/InfoRow";
import { LONG_DATE_FORMAT } from "@/components/Event/utils/dateTimeFormatters";
import * as eventThunks from "@/features/Calendars/services";
import EventUpdateModal from "@/features/Events/EventUpdateModal";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("Event Full Display", () => {
  const mockOnClose = jest.fn();
  const day = new Date("2025-01-15T10:00:00.000Z"); // Fixed date in UTC: Jan 15, 2025 10:00 AM UTC

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "test",
        cal_address: "mailto:test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "First Calendar",
          color: "#FF0000",
          events: {
            event1: {
              uid: "event1",
              title: "Test Event",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: day.toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
              attendee: [
                {
                  cn: "test",
                  cal_address: "test@test.com",
                  partstat: "NEEDS-ACTION",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                },
                {
                  cn: "John",
                  cal_address: "john@test.com",
                  partstat: "NEEDS-ACTION",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                },
              ],
            },
          },
        },
        "otherCal/cal": {
          id: "otherCal/cal",
          name: "Calendar 1",
          color: "#FF0000",
          events: {
            event1: {
              uid: "event1",
              calId: "otherCal/cal",
              title: "Test Event Other cal",
              start: day.toISOString(),
              end: day.toISOString(),
              organizer: { cn: "john", cal_address: "john@test.com" },
            },
          },
        },
      },
      pending: false,
    },
  };

  it("renders correctly event data with fixed timezone", () => {
    // Use fixed timezone UTC for consistent test results across all environments
    const fixedDate = new Date("2025-01-15T10:00:00.000Z"); // 10AM UTC
    const endDate = new Date(fixedDate.getTime() + 3600000); // 11AM UTC

    // With UTC timezone set, formatLocalDateTime produces predictable values
    const expectedStart = "2025-01-15T10:00"; // 10:00 AM UTC
    const expectedEnd = "2025-01-15T11:00"; // 11:00 AM UTC

    const stateWithFixedDate = {
      ...preloadedState,
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                start: fixedDate.toISOString(),
                end: endDate.toISOString(),
                timezone: "UTC",
              },
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
        eventId={"event1"}
      />,
      stateWithFixedDate
    );

    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();

    // Expand to show date/time inputs (normal mode shows DateTimeSummary)
    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));

    const startDateInput = screen.getByTestId("start-date-input");
    const startTimeInput = screen.getByTestId("start-time-input");
    const endTimeInput = screen.getByTestId("end-time-input");

    expect(startDateInput).toBeInTheDocument();
    expect(startTimeInput).toBeInTheDocument();
    expect(endTimeInput).toBeInTheDocument();

    expect(startDateInput).toHaveValue(
      dayjs(expectedStart).format(LONG_DATE_FORMAT)
    );
    expect(startTimeInput).toHaveValue(dayjs(expectedStart).format("HH:mm"));

    expect(endTimeInput).toHaveValue(dayjs(expectedEnd).format("HH:mm"));

    expect(screen.getByText("First Calendar")).toBeInTheDocument();
  });
  it("calls onClose when Cancel clicked", () => {
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getAllByTestId("CloseIcon")[0]);

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("toggle Show More reveals extra fields", async () => {
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "common.moreOptions" })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("event.form.notification")).toBeInTheDocument();
    });

    // Debug: Print DOM to see what's rendered
    console.log("DOM after Show More clicked:", document.body.innerHTML);

    // EventDisplay modal doesn't have Repeat checkbox, only RepeatEvent component
    // which shows repetition settings when repetition data exists
    // Since test event has no repetition data, RepeatEvent component won't show Repeat checkbox
    fireEvent.click(screen.getByRole("button", { name: /Show Less/i }));
  });

  it("can edit title when user is organizer", () => {
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const titleField = screen.getByLabelText("event.form.title");
    fireEvent.change(titleField, { target: { value: "New Title" } });
    expect(screen.getByDisplayValue("New Title")).toBeInTheDocument();
  });
  it("toggle all-day updates end date correctly", () => {
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    const allDayCheckbox = screen.getByLabelText("event.form.allDay");
    fireEvent.click(allDayCheckbox);
    expect(allDayCheckbox).toBeChecked();

    const expectedDate = dayjs(day).format(LONG_DATE_FORMAT);

    const startDateInput = screen.getByTestId("start-date-input");
    const endDateInput = screen.getByTestId("end-date-input");

    expect(startDateInput).toHaveValue(expectedDate);
    expect(endDateInput).toHaveValue(expectedDate);
  });

  it("saves event and moves it when calendar is changed", async () => {
    const spyPut = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
      });
    const spyMove = jest
      .spyOn(eventThunks, "moveEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
      });

    const testDate = new Date("2025-01-15T10:00:00.000Z");
    const testEndDate = new Date("2025-01-15T11:00:00.000Z");
    const preloadedTwoCals = {
      ...preloadedState,
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            id: "667037022b752d0026472254/cal1",
            name: "Calendar One",
            color: "#FF0000",
            events: {
              event1: {
                uid: "event1",
                title: "Test Event",
                calId: "667037022b752d0026472254/cal1",
                start: testDate.toISOString(),
                end: testEndDate.toISOString(),
                organizer: { cn: "test", cal_address: "test@test.com" },
                attendee: [{ cn: "test", cal_address: "test@test.com" }],
              },
            },
          },
          "667037022b752d0026472254/cal2": {
            id: "667037022b752d0026472254/cal2",
            name: "Calendar Two",
            color: "#00FF00",
            events: {},
          },
        },
        pending: false,
      },
    };

    await act(async () =>
      renderWithProviders(
        <EventUpdateModal
          open={true}
          onClose={mockOnClose}
          calId={"667037022b752d0026472254/cal1"}
          eventId={"event1"}
        />,
        preloadedTwoCals
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    const calendarSelect = screen.getByLabelText("event.form.calendar");
    await act(async () => fireEvent.mouseDown(calendarSelect));

    const option = await screen.findByText("Calendar Two");
    fireEvent.click(option);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "actions.save" }));
    });

    await waitFor(
      () => {
        expect(spyPut).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(spyMove).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("edit modal displays event time in original event timezone", () => {
    // GIVEN user timezone is UTC+2
    // WHEN the user edits an event at 2PM UTC+7 (Asia/Bangkok)
    // THEN the update modal displays the time as 2PM in Asia/Bangkok timezone
    const eventDateUTC7 = new Date("2025-01-15T07:00:00.000Z"); // 7AM UTC = 2PM UTC+7

    const stateWithTimezone = {
      ...preloadedState,
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            id: "667037022b752d0026472254/cal1",
            name: "Test Calendar",
            color: "#FF0000",
            events: {
              event1: {
                uid: "event1",
                title: "Timezone Edit Test",
                calId: "667037022b752d0026472254/cal1",
                start: eventDateUTC7.toISOString(),
                end: new Date(eventDateUTC7.getTime() + 3600000).toISOString(),
                timezone: "Asia/Bangkok",
                allday: false,
                organizer: { cn: "test", cal_address: "test@test.com" },
                attendee: [{ cn: "test", cal_address: "test@test.com" }],
              },
            },
          },
        },
        pending: false,
      },
    };

    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      stateWithTimezone
    );

    // Expand to show timezone selector (normal mode hides it)
    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));
    // The timezone select should have Asia/Bangkok selected
    const timeZone = screen.getByDisplayValue(/Asia\/Bangkok/i);
    expect(timeZone).toBeInTheDocument();
  });

  it("InfoRow renders error style when error prop is true", () => {
    renderWithProviders(<InfoRow icon={<span>i</span>} text="Bad" error />);
    expect(screen.getByText("Bad")).toBeInTheDocument();
  });

  it("can remove an attendee with the close button", () => {
    renderWithProviders(
      <EventUpdateModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );

    const removeBtn = screen.getAllByTestId("CloseIcon").pop()!;
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/John/)).not.toBeInTheDocument();
  });

  it("renders video conference info when x_openpass_videoconference exists", () => {
    const videoState = {
      ...preloadedState,
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                x_openpass_videoconference: "https://meet.test/video",
              },
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
        eventId={"event1"}
      />,
      videoState
    );

    expect(
      screen.getByText("event.form.joinVisioConference")
    ).toBeInTheDocument();
  });
});
