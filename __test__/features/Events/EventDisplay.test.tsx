import * as appHooks from "@/app/hooks";
import { AppDispatch } from "@/app/store";
import { InfoRow } from "@/components/Event/InfoRow";
import {
  stringAvatar,
  stringToColor,
} from "@/components/Event/utils/eventUtils";
import { DelegationAccess } from "@/features/Calendars/CalendarTypes";
import * as eventThunks from "@/features/Calendars/services";
import EventPreviewModal from "@/features/Events/EventDisplayPreview";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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
          owner: { emails: ["test@test.com"] },
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
            owner: { emails: ownerEmails },
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
            owner: { emails: ["test@test.com"] },
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

  describe("EventDisplayPreview - delegation", () => {
    const delegatedBaseEvent = {
      uid: "event-1",
      calId: "user2/cal1",
      title: "Delegated Event",
      start: day.toISOString(),
      end: day.toISOString(),
      organizer: { cal_address: "owner@example.com" },
      attendee: [
        { cal_address: "owner@example.com", partstat: "NEEDS-ACTION" },
      ],
      URL: "/calendars/user2/cal1/event-1.ics",
    };

    const makeDelegatedState = (
      eventOverrides = {},
      access: DelegationAccess = {
        write: true,
        freebusy: false,
        read: true,
        "write-properties": false,
        all: false,
      }
    ) => ({
      ...preloadedState,
      calendars: {
        list: {
          "user2/cal1": {
            id: "user2/cal1",
            name: "Delegated Calendar",
            delegated: true,
            access,
            owner: {
              id: "user2",
              firstname: "Bob",
              lastname: "Owner",
              emails: ["owner@example.com"],
              preferredEmail: "owner@example.com",
            },
            color: { light: "#FF0000", dark: "#000" },
            events: {
              "event-1": { ...delegatedBaseEvent, ...eventOverrides },
            },
          },
        },
        templist: {},
        pending: false,
      },
      user: {
        userData: {
          ...preloadedState.user.userData,
          email: "alice@example.com",
          openpaasId: "user1",
        },
      },
    });

    describe("edit button visibility", () => {
      it("shows edit button when calendar is write-delegated and owner is organizer", () => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event-1"
            calId="user2/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          makeDelegatedState()
        );
        expect(
          screen.getByTestId("EditIcon").closest("button")
        ).toBeInTheDocument();
      });

      it("does not show edit button when delegated but owner is not organizer", () => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event-1"
            calId="user2/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          makeDelegatedState({
            organizer: { cal_address: "someone-else@example.com" },
          })
        );
        expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
      });

      it("does not show edit button when delegated with read-only access", () => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event-1"
            calId="user2/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          makeDelegatedState(
            {},
            {
              write: false,
              freebusy: false,
              read: true,
              "write-properties": false,
              all: false,
            }
          )
        );
        expect(screen.queryByTestId("EditIcon")).not.toBeInTheDocument();
      });
    });

    describe("delete menu item visibility", () => {
      it("shows delete option when calendar is write-delegated", () => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event-1"
            calId="user2/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          makeDelegatedState()
        );
        fireEvent.click(screen.getByTestId("MoreVertIcon"));
        expect(
          screen.getByText("eventPreview.deleteEvent")
        ).toBeInTheDocument();
      });

      it("does not show delete option when delegated with read-only access", () => {
        renderWithProviders(
          <EventPreviewModal
            eventId="event-1"
            calId="user2/cal1"
            open={true}
            onClose={mockOnClose}
          />,
          makeDelegatedState(
            {},
            {
              write: false,
              freebusy: false,
              read: true,
              "write-properties": false,
              all: false,
            }
          )
        );
        fireEvent.click(screen.getByTestId("MoreVertIcon"));
        expect(
          screen.queryByText("eventPreview.deleteEvent")
        ).not.toBeInTheDocument();
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
