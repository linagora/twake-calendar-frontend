import { screen, fireEvent } from "@testing-library/react";
import {
  addEvent,
  createCalendar,
} from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventPopover from "../../../src/features/Events/EventModal";
import { DateSelectArg } from "@fullcalendar/core";
import { randomUUID } from "crypto";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../src/utils/dateUtils";
import preview from "jest-preview";
import * as appHooks from "../../../src/app/hooks"; // Import the module

describe("EventPopover", () => {
  const mockOnClose = jest.fn();
  jest.mock("crypto");
  const dispatch = jest.fn();
  jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPopover = (
    selectedRange = {
      startStr: "2025-07-18T09:00",
      endStr: "2025-07-18T10:00",
      start: new Date("2025-07-18T09:00"),
      end: new Date("2025-07-18T10:00"),
      allDay: false,
      resource: undefined,
    } as unknown as DateSelectArg
  ) => {
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
            name: "Calendar 1",
            color: "#FF0000",
          },
          "667037022b752d0026472254/cal2": {
            name: "Calendar 2",
            color: "#00FF00",
          },
        },
        pending: false,
      },
    };
    renderWithProviders(
      <EventPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        selectedRange={selectedRange}
      />,
      preloadedState
    );
  };

  it("renders correctly with inputs and calendar options", () => {
    renderPopover();

    expect(screen.getByText(/Create Event/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    preview.debug();
    // Calendar options
    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select);
    expect(screen.getByText("Calendar 1")).toBeInTheDocument();
    expect(screen.getByText("Calendar 2")).toBeInTheDocument();
  });

  it("fills start and end from selectedRange", () => {
    const selectedRange = {
      startStr: "2026-07-20T10:00",
      endStr: "2026-07-20T12:00",
      start: new Date("2026-07-20T10:00"),
      end: new Date("2026-07-20T12:00"),
      allDay: false,
      resource: undefined,
    };

    renderPopover(selectedRange as unknown as DateSelectArg);

    expect(screen.getByLabelText(/Start/i)).toHaveValue("2026-07-20T10:00");
    expect(screen.getByLabelText(/End/i)).toHaveValue("2026-07-20T12:00");
  });

  it("updates inputs on change", () => {
    renderWithProviders(
      <EventPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        selectedRange={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "My Event" },
    });
    expect(screen.getByLabelText(/title/i)).toHaveValue("My Event");

    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Event Description" },
    });
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      "Event Description"
    );

    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: "Conference Room" },
    });
    expect(screen.getByLabelText(/Location/i)).toHaveValue("Conference Room");
  });

  it("changes selected calendar", async () => {
    renderPopover();

    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select); // Open menu

    const option = await screen.findByText("Calendar 2");
    fireEvent.click(option);

    // The Select control value isn't easy to check directly because MUI Select wraps input,
    // but we can test by triggering save later
  });

  it("dispatches addEvent and calls onClose when Save is clicked", () => {
    renderPopover();

    // Select calendar id
    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select);
    fireEvent.click(screen.getByText("Calendar 1"));

    // Fill inputs
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Meeting" },
    });
    fireEvent.change(screen.getByLabelText(/Start/i), {
      target: { value: "2025-07-18T09:00" },
    });
    fireEvent.change(screen.getByLabelText(/End/i), {
      target: { value: "2025-07-18T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Discuss project" },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: "Zoom" },
    });

    fireEvent.click(screen.getByText(/Save/i));

    expect(dispatch).toHaveBeenCalled();

    // Extract dispatched action argument
    const dispatchedArg = dispatch.mock.calls[0][0].payload;
    console.log(dispatchedArg);
    expect(dispatchedArg.calendarUid).toBe("667037022b752d0026472254/cal1");
    expect(dispatchedArg.event.title).toBe("Meeting");
    expect(dispatchedArg.event.description).toBe("Discuss project");
    expect(dispatchedArg.event.location).toBe("Zoom");
    expect(dispatchedArg.event.color).toBe("#FF0000");
    expect(dispatchedArg.event.organizer).toEqual({
      cn: "test",
      cal_address: "mailto:test@test.com",
    });

    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("calls onClose when Cancel clicked", () => {
    renderPopover();

    fireEvent.click(screen.getByText(/Cancel/i));

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});
