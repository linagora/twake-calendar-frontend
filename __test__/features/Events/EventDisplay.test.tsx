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
  const day = new Date();
  const RealDateToLocaleString = Date.prototype.toLocaleString;

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
    jest.spyOn(Date.prototype, "toLocaleString").mockImplementation(function (
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions | undefined
    ): string {
      return RealDateToLocaleString.call(this, "en-UK", options);
    });
    renderWithProviders(
      <EventPreviewModal
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
    expect(
      screen.getByText(new RegExp(`\\b${dayOfMonth}\\b ${month}`))
    ).toBeInTheDocument();

    expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByText("Delete event"));

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
    const spy = jest
      .spyOn(eventThunks, "getEventAsync")
      .mockImplementation((payload) => {
        return () =>
          Promise.resolve({
            calId: payload.calId,
            event:
              preloadedState.calendars.list["667037022b752d0026472254/cal1"]
                .events["event1"],
          }) as any;
      });

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
      expect(spy).toHaveBeenCalled();
      expect(screen.getByText("Edit Event")).toBeInTheDocument();
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
    const emailButton = screen.getByText("Email attendees");
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
      fireEvent.click(screen.getByText("Show More"));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Notification/i)).toBeInTheDocument();
    });

    // Debug: Print DOM to see what's rendered
    console.log("DOM after Show More clicked:", document.body.innerHTML);

    // EventDisplay modal doesn't have Repeat checkbox, only RepeatEvent component
    // which shows repetition settings when repetition data exists
    // Since test event has no repetition data, RepeatEvent component won't show Repeat checkbox
    fireEvent.click(screen.getByText("Show Less"));
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
    const date = day.toISOString().split("T")[0];

    expect(
      screen.getAllByDisplayValue(new RegExp(date, "i"))[0]
    ).toBeInTheDocument();
  });
  it("saves event and moves it when calendar is changed", async () => {
    const spyPut = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);
    const spyMove = jest
      .spyOn(eventThunks, "moveEventAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);
    const spyRemove = jest.spyOn(eventThunks, "removeEvent");

    const day = new Date();
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
                start: day.toISOString(),
                end: day.toISOString(),
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

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(spyPut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(spyMove).toHaveBeenCalled();
    });

    expect(spyRemove).toHaveBeenCalled();
  });
  //   const spyPut = jest
  //     .spyOn(eventThunks, "putEventAsync")
  //     .mockImplementation((payload) => () => Promise.resolve(payload) as any);
  //   const spyRemove = jest.spyOn(eventThunks, "removeEvent");

  //   const day = new Date();
  //   const preloadedRecurrence = {
  //     ...preloadedState,
  //     calendars: {
  //       list: {
  //         "667037022b752d0026472254/cal1": {
  //           id: "667037022b752d0026472254/cal1",
  //           name: "First Calendar",
  //           color: "#FF0000",
  //           events: {
  //             "base/20250101": {
  //               uid: "base/20250101",
  //               calId: "667037022b752d0026472254/cal1",
  //               title: "eventA",
  //             },
  //             "base/20250201": {
  //               uid: "base/20250201",
  //               calId: "667037022b752d0026472254/cal1",
  //               title: "eventB",
  //             },
  //             "base/20250301": {
  //               uid: "base/20250301",
  //               title: "Recurring event",
  //               calId: "667037022b752d0026472254/cal1",
  //               start: day.toISOString(),
  //               end: day.toISOString(),
  //               organizer: { cal_address: "test@test.com" },
  //               attendee: [{ cal_address: "test@test.com", cn: "Test" }],
  //             },
  //           },
  //         },
  //       },
  //       pending: false,
  //     },
  //   };

  //   renderWithProviders(
  //     <EventDisplayModal
  //       open={true}
  //       onClose={mockOnClose}
  //       calId={"667037022b752d0026472254/cal1"}
  //       eventId={"base/20250301"}
  //     />,
  //     preloadedRecurrence
  //   );

  //   act(() => fireEvent.click(screen.getByText("Save")));

  //   await waitFor(() => {
  //     expect(spyPut).toHaveBeenCalled();
  //   });

  //   await waitFor(() => {
  //     expect(spyRemove).toHaveBeenCalled();
  //   });
  // });

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
      fireEvent.click(screen.getByText("Show More"));
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
