import * as appHooks from "@/app/hooks";
import { AppDispatch } from "@/app/store";
import { InfoRow } from "@/components/Event/InfoRow";
import { LONG_DATE_FORMAT } from "@/components/Event/utils/dateTimeFormatters";
import {
  stringAvatar,
  stringToColor,
} from "@/components/Event/utils/eventUtils";
import * as calendarSlice from "@/features/Calendars/CalendarSlice";
import * as eventThunks from "@/features/Calendars/services";
import EventPreviewModal from "@/features/Events/EventDisplayPreview";
import EventUpdateModal from "@/features/Events/EventUpdateModal";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import dayjs from "dayjs";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("Event Preview Display", () => {
  const mockOnClose = jest.fn();
  const day = new Date("2025-01-15T10:00:00.000Z"); // Fixed date in UTC: Jan 15, 2025 10:00 AM UTC

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    window.MAIL_SPA_URL = null;
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
            event3: {
              uid: "event3",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: day.toISOString(),
              organizer: { cn: "test", cal_address: "test@test.com" },
            },
            event4: {
              uid: "event4",
              calId: "667037022b752d0026472254/cal1",
              start: day.toISOString(),
              end: day.toISOString(),
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
            event2: {
              uid: "event2",
              calId: "otherCal/cal",
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
    const originalToLocaleString = Date.prototype.toLocaleString;

    jest.spyOn(Date.prototype, "toLocaleString").mockImplementation(function (
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions
    ) {
      return originalToLocaleString.call(this, "en-US", options);
    });
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

    jest
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockImplementation(function (
        this: Date,
        locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions
      ) {
        return originalToLocaleTimeString.call(this, "en-US", options);
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

    // With UTC timezone, we can assert exact values
    // Date: January 15, 2025 10:00 AM UTC
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
    expect(screen.getByText(/January/i)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();

    // Check time is displayed in 24h format (no AM/PM)
    // Format: "Wednesday, January 15, 2025 at 10:00" and " – 10:00" are in separate elements
    expect(
      screen.getByText(/Wednesday, January 15, 2025 at 10:00/)
    ).toBeInTheDocument();
    expect(screen.getByText(/– 10:00/)).toBeInTheDocument();

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
    const moreButton = screen.getByTestId("MoreVertIcon");
    if (moreButton) {
      expect(
        screen.queryByText("eventPreview.deleteEvent")
      ).not.toBeInTheDocument();
    }
    cleanup();
    // Renders the personal cal event
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
    expect(screen.queryByText("eventPreview.deleteEvent")).toBeInTheDocument();
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
    fireEvent.click(
      screen.getByRole("menuitem", { name: "eventPreview.deleteEvent" })
    );

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

    expect(
      screen.getByText("eventPreview.attendingQuestion")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "eventPreview.ACCEPTED" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "eventPreview.TENTATIVE" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "eventPreview.DECLINED" })
    ).toBeInTheDocument();
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

    expect(
      screen.queryByText("eventPreview.attendingQuestion")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "eventPreview.ACCEPTED" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "eventPreview.TENTATIVE" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "eventPreview.DECLINED" })
    ).not.toBeInTheDocument();
  });

  it("handles RSVP Accept click", async () => {
    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
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

    fireEvent.click(
      screen.getByRole("button", { name: "eventPreview.ACCEPTED" })
    );

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
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
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

    fireEvent.click(
      screen.getByRole("button", { name: "eventPreview.TENTATIVE" })
    );

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
        const promise = Promise.resolve(payload);
        (promise as any).unwrap = () => promise;
        return () => promise as any;
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

    fireEvent.click(
      screen.getByRole("button", { name: "eventPreview.DECLINED" })
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const updatedEvent = spy.mock.calls[0][0].newEvent;
    expect(updatedEvent.attendee[0].partstat).toBe("DECLINED");
  });
  it("handles Edit click when is own but with no organizer", async () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event4"}
      />,
      preloadedState
    );

    fireEvent.click(screen.getByTestId("EditIcon"));

    await waitFor(() => {
      expect(screen.getByText("event.updateEvent")).toBeInTheDocument();
    });
  });

  it("doesnt show edit button when is not own and with no organizer", async () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"otherCal/cal"}
        eventId={"event2"}
      />,
      preloadedState
    );

    await waitFor(() => {
      expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
    });
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
      expect(screen.getByText("event.updateEvent")).toBeInTheDocument();
    });
  });
  it("properly render message button when MAIL_SPA_URL is not null and event has attendees", () => {
    window.MAIL_SPA_URL = "test";
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
    expect(screen.getByText("eventPreview.emailAttendees")).toBeInTheDocument();
  });
  it("doesnt render message button when MAIL_SPA_URL is not null and event has no attendees", () => {
    window.MAIL_SPA_URL = "test";
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
    window.MAIL_SPA_URL = "test";
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
      name: "eventPreview.emailAttendees",
    });
    expect(emailButton).toBeInTheDocument();

    fireEvent.click(emailButton);

    const event =
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].events[
        "event1"
      ];
    const expectedUrl = `test/mailto/?uri=mailto:john@test.com&subject=Test%20Event`;

    expect(mockOpen).toHaveBeenCalledWith(expectedUrl);
  });

  it("message button encodes special characters in event title correctly", () => {
    window.MAIL_SPA_URL = "test";
    const mockOpen = jest.fn();
    window.open = mockOpen;

    const specialCharState = {
      ...preloadedState,
      calendars: {
        ...preloadedState.calendars,
        list: {
          ...preloadedState.calendars.list,
          "667037022b752d0026472254/cal1": {
            ...preloadedState.calendars.list["667037022b752d0026472254/cal1"],
            events: {
              ...preloadedState.calendars.list["667037022b752d0026472254/cal1"]
                .events,
              eventWithSpecialChars: {
                uid: "eventWithSpecialChars",
                title: "Meeting & Discussion? #Important",
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
        },
      },
    };

    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"eventWithSpecialChars"}
      />,
      specialCharState
    );

    fireEvent.click(screen.getByTestId("MoreVertIcon"));
    const emailButton = screen.getByRole("menuitem", {
      name: "eventPreview.emailAttendees",
    });
    expect(emailButton).toBeInTheDocument();

    fireEvent.click(emailButton);

    const expectedUrl = `test/mailto/?uri=mailto:john@test.com&subject=Meeting%20%26%20Discussion%3F%20%23Important`;

    expect(mockOpen).toHaveBeenCalledWith(expectedUrl);
  });

  describe("Owner Email Permissions", () => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(10, 0, 0, 0);
    const end = new Date(today);
    end.setHours(11, 0, 0, 0);

    beforeEach(() => {
      jest.clearAllMocks();
      const dispatch = jest.fn() as AppDispatch;
      jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);
    });

    const createPreloadedState = (
      userEmail: string,
      ownerEmails: string[],
      organizerEmail: string
    ) => ({
      user: {
        userData: {
          sub: "test",
          email: userEmail,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
        tokens: {
          accessToken: "token",
        },
      },
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: "#FF0000",
            ownerEmails: ownerEmails,
            events: {
              event1: {
                uid: "event1",
                calId: "667037022b752d0026472254/cal1",
                title: "Test Event",
                start: start.toISOString(),
                end: end.toISOString(),
                partstat: "ACCEPTED",
                organizer: {
                  cn: "Organizer",
                  cal_address: organizerEmail,
                },
                attendee: [
                  {
                    cn: "Organizer",
                    partstat: "ACCEPTED",
                    rsvp: "TRUE",
                    role: "REQ-PARTICIPANT",
                    cutype: "INDIVIDUAL",
                    cal_address: organizerEmail,
                  },
                ],
              },
            },
          },
        },
        pending: false,
      },
    });

    it("should show edit button when user email matches organizer and is in ownerEmails", async () => {
      const preloadedState = createPreloadedState(
        "owner@test.com",
        ["owner@test.com"],
        "owner@test.com"
      );

      const mockOnClose = jest.fn();
      renderWithProviders(
        <EventPreviewModal
          eventId="event1"
          calId="667037022b752d0026472254/cal1"
          open={true}
          onClose={mockOnClose}
        />,
        preloadedState
      );

      await waitFor(() => {
        const editButton = screen.queryByTestId("EditIcon");
        expect(editButton).toBeInTheDocument();
      });
    });

    it("should NOT show edit button when user is organizer but not in owner of calendar", async () => {
      const preloadedState = createPreloadedState(
        "organizer@test.com",
        ["other@test.com"], // organizer not in list
        "organizer@test.com"
      );

      const mockOnClose = jest.fn();
      renderWithProviders(
        <EventPreviewModal
          eventId="event1"
          calId="667037022b752d0026472254/cal1"
          open={true}
          onClose={mockOnClose}
        />,
        preloadedState
      );

      await waitFor(() => {
        const editButton = screen.queryByTestId("EditIcon");
        expect(editButton).not.toBeInTheDocument();
      });
    });

    it("should NOT show edit button when user is in ownerEmails but not organizer", async () => {
      const preloadedState = createPreloadedState(
        "owner@test.com",
        ["owner@test.com"],
        "other@test.com" // different organizer
      );

      const mockOnClose = jest.fn();
      renderWithProviders(
        <EventPreviewModal
          eventId="event1"
          calId="667037022b752d0026472254/cal1"
          open={true}
          onClose={mockOnClose}
        />,
        preloadedState
      );

      await waitFor(() => {
        const editButton = screen.queryByTestId("EditIcon");
        expect(editButton).not.toBeInTheDocument();
      });
    });

    it("should handle calendars without ownerEmails property gracefully", async () => {
      const preloadedStateWithoutOwnerEmails = {
        user: {
          userData: {
            sub: "test",
            email: "test@test.com",
            sid: "mockSid",
            openpaasId: "667037022b752d0026472254",
          },
          tokens: {
            accessToken: "token",
          },
        },
        calendars: {
          list: {
            "667037022b752d0026472254/cal1": {
              name: "Calendar 1",
              id: "667037022b752d0026472254/cal1",
              color: "#FF0000",
              // ownerEmails missing
              events: {
                event1: {
                  calId: "667037022b752d0026472254/cal1",
                  uid: "event1",
                  title: "Test Event",
                  start: start.toISOString(),
                  end: end.toISOString(),
                  organizer: {
                    cn: "Test",
                    cal_address: "test@test.com",
                  },
                },
              },
            },
          },
          pending: false,
        },
      };

      const mockOnClose = jest.fn();
      expect(() => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event1"
            calId="667037022b752d0026472254/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          preloadedStateWithoutOwnerEmails
        );
      }).not.toThrow();
    });
  });
  it("renders correctly event data event with empty title", () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        calId={"667037022b752d0026472254/cal1"}
        eventId={"event3"}
      />,
      preloadedState
    );

    expect(screen.getByText("event.untitled")).toBeInTheDocument();

    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  describe("Attendee Preview Display", () => {
    const mockOnClose = jest.fn();
    const day = new Date("2025-01-15T10:00:00.000Z");

    beforeEach(() => {
      jest.clearAllMocks();
      window.MAIL_SPA_URL = null;
    });

    const createStateWithAttendees = (attendees: any[]) => ({
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
                organizer: {
                  cn: "organizer",
                  cal_address: "organizer@test.com",
                },
                attendee: attendees,
              },
            },
            ownerEmails: ["test@test.com"],
          },
        },
        pending: false,
      },
    });

    describe("Guest count display", () => {
      it("displays correct guest count including organizer", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        // Should display "3 guests" (organizer + 2 guests)
        expect(screen.getByText(/3/)).toBeInTheDocument();
      });
    });

    describe("All attendees with single status", () => {
      it("displays only yes count when all attendees accepted", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText("eventPreview.yesCount(count=3)")
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.maybeCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.needActionCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.noCount\b/i)
        ).not.toBeInTheDocument();
      });

      it("displays only TENTATIVE count when all attendees tentative", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "TENTATIVE",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "TENTATIVE",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText("eventPreview.maybeCount(count=2)")
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.yesCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.needActionCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.noCount\b/i)
        ).not.toBeInTheDocument();
      });

      it("displays only no count when all attendees declined", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 3",
            cal_address: "guest3@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText("eventPreview.noCount(count=4)")
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.yesCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.maybeCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.needActionCount/i)
        ).not.toBeInTheDocument();
      });

      it("displays only waiting count when all attendees need action", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText("eventPreview.needActionCount(count=2)")
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.yesCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.maybeCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.noCount/i)
        ).not.toBeInTheDocument();
      });
    });

    describe("No display when count is 0", () => {
      it("does not display attendee preview when no attendees", () => {
        const state = createStateWithAttendees([]);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.queryByTestId("PeopleAltOutlinedIcon")
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/guests/i)).not.toBeInTheDocument();
      });
    });

    describe("Regression tests: mixed statuses with correct counts", () => {
      it("displays all statuses when attendees have mixed responses", () => {
        const attendees = [
          {
            cn: "organizer",
            cal_address: "organizer@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "TENTATIVE",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 3",
            cal_address: "guest3@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 4",
            cal_address: "guest4@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText(/eventPreview.yesCount\(count\=2\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.maybeCount\(count\=1\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.needActionCount\(count\=1\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.noCount\(count\=1\)/i)
        ).toBeInTheDocument();
      });

      it("displays correct counts with multiple yes and TENTATIVE", () => {
        const attendees = [
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 3",
            cal_address: "guest3@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 4",
            cal_address: "guest4@test.com",
            partstat: "TENTATIVE",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 5",
            cal_address: "guest5@test.com",
            partstat: "TENTATIVE",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText(/eventPreview\.yesCount\(count\=3\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview\.maybeCount\(count\=2\)/i)
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.noCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.needActionCount/i)
        ).not.toBeInTheDocument();
      });

      it("displays correct counts with waiting and declined", () => {
        const attendees = [
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 3",
            cal_address: "guest3@test.com",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 4",
            cal_address: "guest4@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText(/eventPreview.needActionCount\(count\=3\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.noCount\(count\=1\)/i)
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.yesCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.maybeCount/i)
        ).not.toBeInTheDocument();
      });

      it("does not display status categories with zero count", () => {
        const attendees = [
          {
            cn: "Guest 1",
            cal_address: "guest1@test.com",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          {
            cn: "Guest 2",
            cal_address: "guest2@test.com",
            partstat: "DECLINED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
        ];

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText(/eventPreview.yesCount\(count\=1\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.noCount\(count\=1\)/i)
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.maybeCount/i)
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(/eventPreview.needActionCount/i)
        ).not.toBeInTheDocument();
      });

      it("handles large number of attendees correctly", () => {
        const attendees = Array.from({ length: 15 }, (_, i) => ({
          cn: `Guest ${i}`,
          cal_address: `guest${i}@test.com`,
          partstat:
            i < 8
              ? "ACCEPTED"
              : i < 11
                ? "TENTATIVE"
                : i < 13
                  ? "NEEDS-ACTION"
                  : "DECLINED",
          rsvp: "TRUE",
          role: "REQ-PARTICIPANT",
          cutype: "INDIVIDUAL",
        }));

        const state = createStateWithAttendees(attendees);
        renderWithProviders(
          <EventPreviewModal
            open={true}
            onClose={mockOnClose}
            calId={"667037022b752d0026472254/cal1"}
            eventId={"event1"}
          />,
          state
        );

        expect(
          screen.getByText(/eventPreview.yesCount\(count\=8\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.maybeCount\(count\=3\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.needActionCount\(count\=2\)/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/eventPreview.noCount\(count\=2\)/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("BUGFIX", () => {
    it("doesnt render anything next to date of all day preview", () => {
      const allDayState = {
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
                  allday: true, // <-- the fix condition
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
        allDayState
      );
      const dateElement =
        screen.getByText(/January/i).closest("p") ??
        screen.getByText(/January/i);

      expect(dateElement).toBeInTheDocument();
      console.log(dateElement.textContent);

      const text = dateElement.textContent?.trim() ?? "";

      expect(text).toMatch(/\d{4}$/);
    });
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

describe("Helper functions", () => {
  it("stringToColor generates consistent color", () => {
    expect(stringToColor("Alice")).toMatch(/^#[0-9a-f]{6}$/);
    expect(stringToColor("Alice")).toBe(stringToColor("Alice"));
  });

  it("stringAvatar returns correct props", () => {
    const result = stringAvatar("Alice");
    expect(result.children).toBe("A");
    expect(result.color).toBeDefined();
    expect(typeof result.color).toBe("string");
  });

  it("stringAvatar returns 2-letter initials for full name", () => {
    const result = stringAvatar("John Doe");
    expect(result.children).toBe("JD");
    expect(result.color).toBeDefined();
    expect(typeof result.color).toBe("string");
  });

  it("stringAvatar handles single word names", () => {
    const result = stringAvatar("Alice");
    expect(result.children).toBe("A");
    expect(result.color).toBeDefined();
  });

  it("stringAvatar handles email addresses", () => {
    const result = stringAvatar("test@example.com");
    expect(result.children).toBe("T");
    expect(result.color).toBeDefined();
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
