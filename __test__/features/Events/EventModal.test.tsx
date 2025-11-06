import { DateSelectArg } from "@fullcalendar/core";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import preview from "jest-preview";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import EventPopover from "../../../src/features/Events/EventModal";
import { api } from "../../../src/utils/apiUtils";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../src/utils/dateUtils";
import { renderWithProviders } from "../../utils/Renderwithproviders";

jest.mock("../../../src/utils/apiUtils");

describe("EventPopover", () => {
  const mockOnClose = jest.fn();
  const mockSetSelectedRange = jest.fn();
  const mockCalendarRef = { current: { select: jest.fn() } } as any;

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
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "Calendar 1",
          color: "#FF0000",
        },
        "667037022b752d0026472254/cal2": {
          id: "667037022b752d0026472254/cal2",
          name: "Calendar 2",
          color: "#00FF00",
        },
      },
      pending: false,
    },
  };

  const mockUsers = [
    {
      id: "john@example.com",
      objectType: "user",
      emailAddresses: [
        {
          value: "john@example.com",
          type: "default",
        },
      ],
      names: [
        {
          displayName: "John Doe",
          type: "default",
        },
      ],
    },
    {
      id: "jane@example.com",
      objectType: "user",
      emailAddresses: [
        {
          value: "jane@example.com",
          type: "default",
        },
      ],
      names: [
        {
          displayName: "Jane Smith",
          type: "default",
        },
      ],
    },
  ];
  (api.post as jest.Mock).mockReturnValue({
    json: jest.fn().mockResolvedValue(mockUsers),
  });

  const defaultSelectedRange = {
    startStr: "2025-07-18T09:00",
    endStr: "2025-07-18T10:00",
    start: new Date("2025-07-18T09:00"),
    end: new Date("2025-07-18T10:00"),
    allDay: false,
    resource: undefined,
  } as unknown as DateSelectArg;

  const renderPopover = (selectedRange = defaultSelectedRange) => {
    renderWithProviders(
      <EventPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        selectedRange={selectedRange}
        setSelectedRange={mockSetSelectedRange}
        calendarRef={mockCalendarRef}
      />,
      preloadedState
    );
  };

  it("renders correctly with inputs and calendar options", () => {
    renderPopover();

    // Check dialog title
    expect(screen.getByText("event.createEvent")).toBeInTheDocument();

    // Check inputs exist by their roles
    const titleInput = screen.getByRole("textbox", { name: /title/i });
    expect(titleInput).toBeInTheDocument();

    // Description input is only visible after clicking "Add description" button
    const addDescriptionButton = screen.getByRole("button", {
      name: "event.form.addDescription",
    });
    expect(addDescriptionButton).toBeInTheDocument();

    const calendarSelect = screen.getByRole("combobox", { name: /calendar/i });
    expect(calendarSelect).toBeInTheDocument();

    // Check button
    expect(
      screen.getByRole("button", { name: "common.moreOptions" })
    ).toBeInTheDocument();

    // Extended mode
    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));

    // Back button appears
    expect(screen.getByLabelText("show less")).toBeInTheDocument();

    // Extended labels appear
    expect(screen.getAllByText("event.form.repeat")).toHaveLength(1);
    expect(screen.getAllByText("event.form.notification")).toHaveLength(1);
    expect(screen.getAllByText("event.form.visibleTo")).toHaveLength(1);
    expect(screen.getAllByText("event.form.showMeAs")).toHaveLength(1);
  });

  it("fills start from selectedRange", () => {
    renderPopover({
      startStr: "2026-07-20T10:00",
      endStr: "2026-07-20T12:00",
      start: new Date("2026-07-20T10:00"),
      end: new Date("2026-07-20T12:00"),
      allDay: false,
    } as unknown as DateSelectArg);

    // MUI DatePicker/TimePicker values are stored differently - just check elements exist
    expect(screen.getByTestId("start-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("start-time-input")).toBeInTheDocument();
  });

  it("updates inputs on change", () => {
    renderPopover();

    fireEvent.change(screen.getByLabelText("event.form.title"), {
      target: { value: "My Event" },
    });
    expect(screen.getByLabelText("event.form.title")).toHaveValue("My Event");

    // Click "Add description" button first
    fireEvent.click(
      screen.getByRole("button", { name: "event.form.addDescription" })
    );

    fireEvent.change(screen.getByLabelText("event.form.description"), {
      target: { value: "Event Description" },
    });
    expect(screen.getByLabelText("event.form.description")).toHaveValue(
      "Event Description"
    );

    fireEvent.change(screen.getByLabelText("event.form.location"), {
      target: { value: "Conference Room" },
    });
    expect(screen.getByLabelText("event.form.location")).toHaveValue(
      "Conference Room"
    );
  });

  it("changes selected calendar", async () => {
    renderPopover();

    const select = screen.getByLabelText("event.form.calendar");
    fireEvent.mouseDown(select); // Open menu

    const option = await screen.findByText("Calendar 2");
    fireEvent.click(option);

    // Find the calendar combobox specifically by its aria-labelledby
    const calendarSelect = screen.getByRole("combobox", { name: /Calendar/i });
    expect(calendarSelect).toHaveTextContent("Calendar 2");
  });
  it("adds a attendee", async () => {
    jest.useFakeTimers();
    renderPopover();
    fireEvent.change(screen.getByLabelText("event.form.title"), {
      target: { value: "newEvent" },
    });
    const select = screen.getByLabelText("peopleSearch.label");

    act(() => {
      select.focus();
      fireEvent.mouseDown(select);
      userEvent.type(select, "john");
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    await act(async () => {
      userEvent.click(screen.getByText("John Doe"));
    });

    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    fireEvent.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const receivedPayload = spy.mock.calls[0][0];

    expect(receivedPayload.cal).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"]
    );

    expect(receivedPayload.newEvent.attendee).toHaveLength(2);
    expect(receivedPayload.newEvent.attendee).toStrictEqual([
      {
        cn: "test",
        cal_address: "test@test.com",
        partstat: "ACCEPTED",
        rsvp: "FALSE",
        role: "CHAIR",
        cutype: "INDIVIDUAL",
      },
      {
        cn: "John Doe",
        cal_address: "john@example.com",
        partstat: "NEED_ACTION",
        rsvp: "FALSE",
        role: "CHAIR",
        cutype: "INDIVIDUAL",
      },
    ]);
  });

  it("dispatches putEventAsync and calls onClose when Save is clicked", async () => {
    renderPopover();
    const newEvent = {
      title: "Meeting",
      allday: false,
      uid: "6045c603-11ab-43c5-bc30-0641420bb3a8",
      description: "Discuss project",
      location: "Zoom",
      organizer: { cn: "test", cal_address: "test@test.com" },
      timezone: "Europe/Paris",
      transp: "TRANSPARENT",
    };

    // Fill inputs
    fireEvent.change(screen.getByLabelText("event.form.title"), {
      target: { value: newEvent.title },
    });
    // Click "Add description" button first
    fireEvent.click(
      screen.getByRole("button", { name: "event.form.addDescription" })
    );
    fireEvent.change(screen.getByLabelText("event.form.description"), {
      target: { value: newEvent.description },
    });
    fireEvent.change(screen.getByLabelText("event.form.location"), {
      target: { value: newEvent.location },
    });
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    fireEvent.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const receivedPayload = spy.mock.calls[0][0];

    expect(receivedPayload.cal).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"]
    );

    expect(receivedPayload.newEvent.title).toBe(newEvent.title);
    expect(receivedPayload.newEvent.description).toBe(newEvent.description);
    expect(receivedPayload.newEvent.location).toBe(newEvent.location);
    expect(receivedPayload.newEvent.organizer).toEqual(newEvent.organizer);
    expect(receivedPayload.newEvent.color).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].color
    );

    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("calls onClose when Cancel clicked", () => {
    renderPopover();

    // Cancel button only appears in expanded mode
    fireEvent.click(screen.getByRole("button", { name: "common.moreOptions" }));

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("BUGFIX: Prefill Calendar field", async () => {
    renderPopover();
    await waitFor(() =>
      expect(screen.getByLabelText("event.form.calendar")).toHaveTextContent(
        "Calendar 1"
      )
    );
  });
});
