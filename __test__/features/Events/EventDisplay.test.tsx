import { screen, fireEvent, waitFor } from "@testing-library/react";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import EventDisplayModal, {
  InfoRow,
  stringAvatar,
  stringToColor,
} from "../../../src/features/Events/EventDisplay";
import EventPreviewModal from "../../../src/features/Events/EventDisplayPreview";
describe("Event Preview Display", () => {
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
          name: "Calendar",
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
      <EventPreviewModal
        anchorPosition={{ top: 0, left: 0 }}
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
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });
  it("calls onClose when Cancel clicked", () => {
    renderWithProviders(
      <EventPreviewModal
        anchorPosition={{ top: 0, left: 0 }}
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
        anchorPosition={{ top: 0, left: 0 }}
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
      <EventPreviewModal
        anchorPosition={{ top: 0, left: 0 }}
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
      <EventPreviewModal
        anchorPosition={{ top: 0, left: 0 }}
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
      <EventPreviewModal
        anchorPosition={{ top: 0, left: 0 }}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(screen.getByText("Will you attend?")).toBeInTheDocument();
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
        anchorPosition={{ top: 0, left: 0 }}
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      rsvpStateIsOrga
    );

    expect(screen.queryByText("Will you attend?")).not.toBeInTheDocument();
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
        anchorPosition={{ top: 0, left: 0 }}
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
      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
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
        anchorPosition={{ top: 0, left: 0 }}
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
      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
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
        anchorPosition={{ top: 0, left: 0 }}
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
      expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("DECLINED");
  });
});

describe("Event Full Display", () => {
  const mockOnClose = jest.fn();
  const day = new Date();

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

  it("renders correctly event data", () => {
    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    const tzOffset = day.getTimezoneOffset() * 60000; // offset in ms
    const date = new Date(day.getTime() - tzOffset).toISOString().slice(0, 16);

    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();
    expect(
      screen.getAllByDisplayValue(new RegExp(date, "i"))[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByDisplayValue(new RegExp(date, "i")).length
    ).toBeLessThanOrEqual(2);

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
  test("toggle Show More reveals extra fields", () => {
    renderWithProviders(
      <EventDisplayModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event1"}
      />,
      preloadedState
    );
    fireEvent.click(screen.getByText("Show More"));
    expect(screen.getByLabelText("Alarm")).toBeInTheDocument();
    expect(screen.getByLabelText("Repetition")).toBeInTheDocument();
    expect(screen.getByLabelText("Visibility")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show Less"));
  });

  test("can edit title when user is organizer", () => {
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
  test("calendar select is disabled when not organizer", () => {
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
    expect(screen.getByLabelText("Calendar")).toHaveClass("Mui-disabled");
  });
  test("toggle all-day updates end date correctly", () => {
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
    const date = day.toISOString().split("T")[0];

    expect(
      screen.getAllByDisplayValue(new RegExp(date, "i"))[0]
    ).toBeInTheDocument();
  });
});

describe("Helper functions", () => {
  test("stringToColor generates consistent color", () => {
    expect(stringToColor("Alice")).toMatch(/^#[0-9a-f]{6}$/);
    expect(stringToColor("Alice")).toBe(stringToColor("Alice"));
  });

  test("stringAvatar returns correct props", () => {
    const result = stringAvatar("Alice");
    expect(result.children).toBe("A");
    expect(result.sx.bgcolor).toMatch(/^#/);
  });

  test("InfoRow renders text and link if url is valid", () => {
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
