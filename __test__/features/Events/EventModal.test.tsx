import { screen, fireEvent } from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventPopover from "../../../src/features/Events/EventModal";
import { DateSelectArg } from "@fullcalendar/core";
import preview from "jest-preview";

describe("EventPopover", () => {
  const mockOnClose = jest.fn();
  jest.mock("crypto");

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

    expect(screen.getByText("Create Event")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeInTheDocument();
    expect(screen.getByLabelText("All day")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toBeInTheDocument();
    expect(screen.getByLabelText("Repetition")).toBeInTheDocument();
    expect(screen.getByLabelText("Time Zone")).toBeInTheDocument();
    // Calendar options
    const select = screen.getByLabelText("Calendar");
    fireEvent.mouseDown(select);
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("fills start from selectedRange", () => {
    const selectedRange = {
      startStr: "2026-07-20T10:00",
      endStr: "2026-07-20T12:00",
      start: new Date("2026-07-20T10:00"),
      end: new Date("2026-07-20T12:00"),
      allDay: false,
      resource: undefined,
    };

    renderPopover(selectedRange as unknown as DateSelectArg);
    expect(screen.getByLabelText("Start")).toHaveValue("2026-07-20T10:00");
  });

  it("updates inputs on change", () => {
    renderPopover();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Event" },
    });
    expect(screen.getByLabelText("Title")).toHaveValue("My Event");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Event Description" },
    });
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Event Description"
    );

    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Conference Room" },
    });
    expect(screen.getByLabelText("Location")).toHaveValue("Conference Room");
  });

  it("changes selected calendar", async () => {
    renderPopover();

    const select = screen.getByLabelText("Calendar");
    fireEvent.mouseDown(select); // Open menu

    const option = await screen.findByText("Calendar 2");
    fireEvent.click(option);

    expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("Calendar 2");
  });

  it("dispatches putEventAsync and calls onClose when Save is clicked", async () => {
    renderPopover();
    const newEvent = {
      title: "Meeting",
      start: "2025-07-18T00:00:00.000Z",
      end: "2025-07-19T00:00:00.000Z",
      allday: false,
      uid: "6045c603-11ab-43c5-bc30-0641420bb3a8",
      description: "Discuss project",
      location: "Zoom",
      repetition: "",
      organizer: { cn: "test", cal_address: "mailto:test@test.com" },
      timezone: "Europe/Paris",
      transp: "OPAQUE",
    };

    // Fill inputs
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: newEvent.title },
    });
    fireEvent.click(screen.getByLabelText("All day"));
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: newEvent.start.split("T")[0] },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: newEvent.end.split("T")[0] },
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: newEvent.description },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: newEvent.location },
    });

    let receivedPayload: any = null;

    jest.spyOn(eventThunks, "putEventAsync").mockImplementation((payload) => {
      receivedPayload = payload;
      return () => Promise.resolve() as any;
    });

    fireEvent.click(screen.getByText("Save"));
    expect(eventThunks.putEventAsync).toHaveBeenCalled();

    // Extract dispatched action argument
    console.log(receivedPayload);
    expect(receivedPayload.cal).toBe(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"]
    );
    expect(receivedPayload.newEvent.title).toBe(newEvent.title);
    expect(receivedPayload.newEvent.description).toBe(newEvent.description);
    expect(receivedPayload.newEvent.start.toString()).toBe(
      new Date(newEvent.start).toString()
    );
    expect(receivedPayload.newEvent.end.toString()).toBe(
      new Date(newEvent.end).toString()
    );
    expect(receivedPayload.newEvent.location).toBe(newEvent.location);
    expect(receivedPayload.newEvent.organizer).toEqual(newEvent.organizer);
    expect(receivedPayload.newEvent.repetition).toEqual(newEvent.repetition);
    expect(receivedPayload.newEvent.color).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].color
    );

    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("calls onClose when Cancel clicked", () => {
    renderPopover();

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});
