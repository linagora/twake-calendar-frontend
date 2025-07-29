import { screen, fireEvent, waitFor } from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventPopover from "../../../src/features/Events/EventModal";
import { DateSelectArg } from "@fullcalendar/core";
import preview from "jest-preview";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../src/utils/dateUtils";
import EventDisplayModal from "../../../src/features/Events/EventDisplay";

describe("Event Display", () => {
  const mockOnClose = jest.fn();
  const day = new Date();
  const RealDateToLocaleString = Date.prototype.toLocaleString;

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
          name: "Calendar 1",
          color: "#FF0000",
          events: {
            event1: {
              id: "event1",
              title: "Test Event",
              start: day.toISOString(),
              end: day.toISOString(),
            },
          },
        },
        "otherCal/cal": {
          id: "otherCal/cal",
          name: "Calendar 1",
          color: "#FF0000",
          events: {
            event1: {
              id: "event1",
              title: "Test Event Other cal",
              start: day.toISOString(),
              end: day.toISOString(),
            },
          },
        },
      },
      pending: false,
    },
  };

  it("renders correctly event data", () => {
    jest
      .spyOn(Date.prototype, "toLocaleString")
      .mockImplementation(function (
        this: Date,
        locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions | undefined
      ): string {
        return RealDateToLocaleString.call(this, "en-UK", options);
      });
    renderWithProviders(
      <EventDisplayModal
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const weekday = day.toLocaleString("en-UK", { weekday: "long" });
    const month = day.toLocaleString("en-UK", { month: "long" });
    const dayOfMonth = day.getDate().toString();

    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(weekday, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(month, "i"))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`\\b${dayOfMonth}\\b`))
    ).toBeInTheDocument();

    expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText("Calendar 1")).toBeInTheDocument();
  });
  it("calls onClose when Cancel clicked", () => {
    renderWithProviders(
      <EventDisplayModal
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getByTestId("CloseIcon"));

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("Shows delete button only when calendar is own", () => {
    // Renders the other cal event
    renderWithProviders(
      <EventDisplayModal
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calId={"otherCal/cal"}
        eventId={"event1"}
      />,
      preloadedState
    );
    expect(screen.queryByTestId("DeleteIcon")).not.toBeInTheDocument();
    // Renders the personnal cal event
    renderWithProviders(
      <EventDisplayModal
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    expect(screen.queryByTestId("DeleteIcon")).toBeInTheDocument();
  });
  it("calls delete when Delete clicked", async () => {
    renderWithProviders(
      <EventDisplayModal
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const spy = jest
      .spyOn(eventThunks, "deleteEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    fireEvent.click(screen.getByTestId("DeleteIcon"));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const receivedPayload = spy.mock.calls[0][0];

    expect(receivedPayload).toEqual({
      calId: "667037022b752d0026472254/cal1",
      eventId: "event1",
    });

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});
