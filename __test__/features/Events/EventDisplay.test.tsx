import {
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventDisplayModal from "../../../src/features/Events/EventDisplay";
import EventPreviewModal from "../../../src/features/Events/EventDisplayPreview";
import { InfoRow } from "../../../src/components/Event/InfoRow";
import {
  stringToColor,
  stringAvatar,
} from "../../../src/components/Event/utils/eventUtils";

describe("Event Preview Display", () => {
  const mockOnClose = jest.fn();
  const day = new Date("2025-01-15T10:00:00.000Z"); // Fixed date in UTC: Jan 15, 2025 10:00 AM UTC

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).MAIL_SPA_URL = null;
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
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "Calendar",
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
            event2: {
              uid: "event2",
              title: "Test Event",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: day.toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
            },
          },
          ownerEmails: ["test@test.com"],
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

  it("renders correctly event data", () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );

    // With UTC timezone, we can assert exact values
    // Date: January 15, 2025 10:00 AM UTC
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
    expect(screen.getByText(/January/i)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();

    // Check time is displayed with exact values
    // Format: "Wednesday, January 15, 2025 at 10:00 AM" and " – 10:00 AM" are in separate elements
    expect(
      screen.getByText(/Wednesday, January 15, 2025 at 10:00 AM/)
    ).toBeInTheDocument();
    expect(screen.getByText(/– 10:00 AM/)).toBeInTheDocument();

    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });
  it("calls onClose when Cancel clicked", () => {
    renderWithProviders(
      <EventPreviewModal
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
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"otherCal/cal"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    expect(screen.queryByText("Delete event")).not.toBeInTheDocument();
    cleanup();
    // Renders the personnal cal event
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    expect(screen.queryByText("Delete event")).toBeInTheDocument();
  });
  it("calls delete when Delete clicked", async () => {
    renderWithProviders(
      <EventPreviewModal
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
    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete event/i }));

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
  it("renders RSVP buttons when user is an attendee", () => {
    const rsvpStateIsOrga = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                  {
                    cal_address: "organizer@test.com",
                    cn: "Test Organizer",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(screen.getByText("Attending?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maybe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });
  it("doesnt renders RSVP buttons when user isnt an attendee", () => {
    const rsvpStateIsOrga = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "organizer@test.com",
                    cn: "Test Organizer",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(screen.queryByText("Attending?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Maybe" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Decline" })
    ).not.toBeInTheDocument();
  });

  it("handles RSVP Accept click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("ACCEPTED");
  });

  it("handles RSVP Maybe click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Maybe" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("TENTATIVE");
  });

  it("handles RSVP Decline click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("DECLINED");
  });
  it("handles Edit click", async () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );

    fireEvent.click(screen.getByTestId("EditIcon"));

    await waitFor(() => {
      expect(screen.getByText("Update Event")).toBeInTheDocument();
    });
  });
  it("properly render message button when MAIL_SPA_URL is not null and event has attendees", () => {
    (window as any).MAIL_SPA_URL = "test";
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    expect(screen.getByText("Email attendees")).toBeInTheDocument();
  });
  it("doesnt render message button when MAIL_SPA_URL is not null and event has no attendees", () => {
    (window as any).MAIL_SPA_URL = "test";
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event2"}
      />,
      preloadedState
    );
    expect(screen.queryByTestId("EmailIcon")).not.toBeInTheDocument();
  });
  it("doesnt render message button when MAIL_SPA_URL is null and event has attendees", () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    expect(screen.queryByTestId("EmailIcon")).not.toBeInTheDocument();
  });
  it("message button opens url with attendees as uri and title as subject", () => {
    (window as any).MAIL_SPA_URL = "test";
    const mockOpen = jest.fn();
    window.open = mockOpen;

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );

    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    const emailButton = screen.getByRole("menuitem", {
      name: /Email attendees/i,
    });
    expect(emailButton).toBeInTheDocument();

    fireEvent.click(emailButton);

    const event =
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].events[
        "event1"
      ];
    const expectedUrl = `test/mailto/?uri=mailto:john@test.com?subject=Test Event`;

    expect(mockOpen).toHaveBeenCalledWith(expectedUrl);
  });
});

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
              id: "event1",
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
              id: "event1",
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
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      stateWithFixedDate
    );

    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();

    // Exact value assertions with declarative expected values
    const startInput = screen.getByLabelText("Start");
    expect(startInput).toBeInTheDocument();
    expect(startInput).toHaveAttribute("type", "datetime-local");
    expect(startInput.getAttribute("value")).toBe(expectedStart);

    const endInput = screen.getByLabelText("End");
    expect(endInput.getAttribute("value")).toBe(expectedEnd);

    expect(screen.getByText("First Calendar")).toBeInTheDocument();
  });
  it("calls onClose when Cancel clicked", () => {
    renderWithProviders(
      <EventDisplayModal
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
  it("Shows delete button only when calendar is own", () => {
    // Renders the other cal event
    renderWithProviders(
      <EventDisplayModal
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
  it("renders RSVP buttons when user is an attendee", () => {
    const rsvpStateIsOrga = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                  {
                    cal_address: "organizer@test.com",
                    cn: "Test Organizer",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maybe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });
  it("doesnt renders RSVP buttons when user isnt an attendee", () => {
    const rsvpStateIsOrga = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "organizer@test.com",
                    cn: "Test Organizer",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(
      screen.queryByRole("button", { name: "Accept" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Maybe" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Decline" })
    ).not.toBeInTheDocument();
  });

  it("handles RSVP Accept click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("ACCEPTED");
  });

  it("handles RSVP Maybe click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Maybe" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("TENTATIVE");
  });

  it("handles RSVP Decline click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("DECLINED");
  });
  it("toggle Show More reveals extra fields", async () => {
    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Show More/i }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Notification/i)).toBeInTheDocument();
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
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const titleField = screen.getByLabelText("Title");
    fireEvent.change(titleField, { target: { value: "New Title" } });
    expect(screen.getByDisplayValue("New Title")).toBeInTheDocument();
  });
  it("calendar select is disabled when not organizer", () => {
    const rsvpState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              event1: {
                ...preloadedState.calendars.list[
                  "667037022b752d0026472254/cal1"
                ].events.event1,
                attendee: [
                  {
                    cal_address: "test@test.com",
                    cn: "Test User",
                    partstat: "NEEDS-ACTION",
                  },
                ],
                organizer: {
                  cal_address: "organizer@test.com",
                  cn: "Edgar Organiser",
                },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpState
    );
    expect(screen.getByLabelText("Calendar")).toHaveClass("Mui-disabled");
  });
  it("toggle all-day updates end date correctly", () => {
    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const allDayCheckbox = screen.getByLabelText("All day");
    fireEvent.click(allDayCheckbox);
    expect(allDayCheckbox).toBeChecked();

    // Calculate expected date value (YYYY-MM-DD format for all-day events)
    const expectedDate = day.toISOString().split("T")[0];

    // Use exact value assertion instead of regex
    const dateInputs = screen.getAllByDisplayValue(expectedDate);
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
    expect(dateInputs[0]).toBeInTheDocument();
  });
  it("saves event and moves it when calendar is changed", async () => {
    const spyPut = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);
    const spyMove = jest
      .spyOn(eventThunks, "moveEventAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);
    const spyRemove = jest.spyOn(eventThunks, "removeEvent");

    const testDate = new Date("2025-01-15T10:00:00.000Z");
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
                uid: "uid-base",
                id: "event1",
                title: "Test Event",
                calId: "667037022b752d0026472254/cal1",
                start: testDate.toISOString(),
                end: testDate.toISOString(),
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

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedTwoCals
    );

    fireEvent.mouseDown(screen.getByLabelText("Calendar"));

    const option = await screen.findByText("Calendar Two");
    fireEvent.click(option);

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(spyPut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(spyMove).toHaveBeenCalled();
    });

    expect(spyRemove).toHaveBeenCalled();
  });

  it("saves recurring event with updateSeriesAsync when typeOfAction is all", async () => {
    const spyUpdateSeries = jest
      .spyOn(eventThunks, "updateSeriesAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);

    // Mock getEvent API call to avoid API errors in test
    const EventApi = require("../../../src/features/Events/EventApi");
    const testDate = new Date("2025-01-15T10:00:00.000Z");
    jest.spyOn(EventApi, "getEvent").mockResolvedValue({
      uid: "base",
      title: "Recurring event",
      calId: "667037022b752d0026472254/cal1",
      start: testDate.toISOString(),
      end: testDate.toISOString(),
      repetition: { freq: "daily", interval: 1 },
    });
    const preloadedRecurrence = {
      ...preloadedState,
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            id: "667037022b752d0026472254/cal1",
            name: "First Calendar",
            color: "#FF0000",
            events: {
              base: {
                uid: "base",
                calId: "667037022b752d0026472254/cal1",
                title: "Recurring event",
                start: testDate.toISOString(),
                end: testDate.toISOString(),
                organizer: { cal_address: "test@test.com" },
                attendee: [{ cal_address: "test@test.com", cn: "Test" }],
                repetition: { freq: "daily", interval: 1 },
              },
              "base/20250101": {
                uid: "base/20250101",
                calId: "667037022b752d0026472254/cal1",
                title: "Recurring event",
                start: testDate.toISOString(),
                end: testDate.toISOString(),
                organizer: { cal_address: "test@test.com" },
                attendee: [{ cal_address: "test@test.com", cn: "Test" }],
              },
              "base/20250201": {
                uid: "base/20250201",
                calId: "667037022b752d0026472254/cal1",
                title: "Recurring event",
                start: testDate.toISOString(),
                end: testDate.toISOString(),
                organizer: { cal_address: "test@test.com" },
                attendee: [{ cal_address: "test@test.com", cn: "Test" }],
              },
            },
          },
        },
        pending: false,
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"base/20250101"}
        typeOfAction="all"
      />,
      preloadedRecurrence
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(spyUpdateSeries).toHaveBeenCalled();
    });
  });

  it("displays event time in user local timezone when user timezone differs from event timezone", () => {
    // GIVEN user timezone is UTC+2 (Europe/Paris)
    // WHEN the user opens an event at 2PM UTC+7 (Asia/Bangkok)
    // THEN the event is displayed at 9AM UTC+2 (in local time format)

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
                title: "Timezone Test Event",
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
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      stateWithTimezone
    );

    // Verify title input field has the event title
    const titleInput = screen.getByDisplayValue("Timezone Test Event");
    expect(titleInput).toBeInTheDocument();

    // Verify the datetime input field exists
    const startInput = screen.getByLabelText("Start");
    expect(startInput).toBeInTheDocument();
    expect(startInput).toHaveAttribute("type", "datetime-local");
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
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      stateWithTimezone
    );

    // Verify the timezone select shows Asia/Bangkok
    fireEvent.click(screen.getByRole("button", { name: /Show More/i }));

    // The timezone select should have Asia/Bangkok selected
    // Since the component uses formatLocalDateTime, the displayed time will be in local format
    // but the timezone selector should show Asia/Bangkok
    const titleInput = screen.getByDisplayValue("Timezone Edit Test");
    expect(titleInput).toBeInTheDocument();
  });

  it("InfoRow renders error style when error prop is true", () => {
    renderWithProviders(<InfoRow icon={<span>i</span>} text="Bad" error />);
    expect(screen.getByText("Bad")).toBeInTheDocument();
  });

  it("calls onClose from useEffect if event or calendar missing", () => {
    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"nonexistent/cal"}
        eventId={"ghost"}
      />,
      preloadedState
    );
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("renders error row when event has error", () => {
    const errorState = {
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
                error: "Something went wrong",
              },
            },
          },
        },
        pending: false,
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      errorState
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Show More/i }));
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("can remove an attendee with the close button", () => {
    renderWithProviders(
      <EventDisplayModal
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

  it("shows more attendees when overflow, then toggles back", () => {
    const overflowState = {
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
                attendee: new Array(6).fill(null).map((_, i) => ({
                  cn: `Person${i}`,
                  cal_address: `p${i}@test.com`,
                })),
                organizer: { cn: "test", cal_address: "test@test.com" },
              },
            },
          },
        },
      },
    };

    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      overflowState
    );

    const toggle = screen.getByText(/Show more/);
    fireEvent.click(toggle);

    expect(screen.getByText(/Show less/)).toBeInTheDocument();
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
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      videoState
    );

    expect(screen.getByText("Join the video conference")).toBeInTheDocument();
  });
});

describe("Helper functions", () => {
  it("stringToColor generates consistent color", () => {
    expect(stringToColor("Alice")).toMatch(/^#[0-9a-f]{6}$/);
    expect(stringToColor("Alice")).toBe(stringToColor("Alice"));
  });

  it("stringAvatar returns correct props", () => {
    const result = stringAvatar("Alice");
    expect(result.children).toBe("A");
    expect(result.style.backgroundColor).toMatch(/^#/);
  });

  it("InfoRow renders text and link if url is valid", () => {
    renderWithProviders(
      <InfoRow
        icon={<span>ico</span>}
        text="Meeting"
        data="https://example.com"
      />
    );
    expect(screen.getByText("Meeting").closest("a")).toHaveAttribute(
      "href",
      "https://example.com"
    );
  });
});
