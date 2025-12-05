import { CalendarApi } from "@fullcalendar/core";
import { jest } from "@jest/globals";
import { ThunkDispatch } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import * as appHooks from "../../src/app/hooks";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import CalendarApp from "../../src/components/Calendar/Calendar";
import EventUpdateModal from "../../src/features/Events/EventUpdateModal";
import { renderWithProviders } from "../utils/Renderwithproviders";
import {
  createEventHandlers,
  EventHandlersProps,
} from "../../src/components/Calendar/handlers/eventHandlers";

describe("CalendarApp integration", () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  beforeEach(() => {
    jest.clearAllMocks();
    const dispatch = jest.fn() as ThunkDispatch<any, any, any>;
    jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);
  });

  const renderCalendar = () => {
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
        tokens: { accessToken: "token" }, // required to avoid redirect
      },
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            id: "667037022b752d0026472254/cal1",
            color: { light: "#FFFFFF", dark: "#000000" },
            ownerEmails: ["alice@example.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Test Event",
                start: start.toISOString(),
                end: end.toISOString(),
                partstat: "ACCEPTED",
                organizer: {
                  cn: "Alice",
                  cal_address: "alice@example.com",
                },
                attendee: [
                  {
                    cn: "Alice",
                    partstat: "ACCEPTED",
                    rsvp: "TRUE",
                    role: "REQ-PARTICIPANT",
                    cutype: "INDIVIDUAL",
                    cal_address: "alice@example.com",
                  },
                ],
              },
            },
          },
        },
        pending: false,
      },
    };

    const mockCalendarRef = { current: null };
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );
  };

  it("renders the event on the calendar and calendarRef works", async () => {
    const dispatch = appHooks.useAppDispatch();

    renderCalendar();
    const calendarRef: React.RefObject<CalendarApi | null> = (window as any)
      .__calendarRef;

    const calendarApi = calendarRef.current;

    // Wait for the FullCalendar DOM to populate
    const eventEl = await screen.findByText(
      "Test Event",
      {},
      { timeout: 3000 }
    );
    expect(eventEl).toBeInTheDocument();
    act(() => {
      if (calendarApi) {
        const fcEvent = calendarApi.getEventById("event1");
        expect(fcEvent?.title).toBe("Test Event");
        const oldEnd = new Date(today.getTime() + 3600000); // +1 hour
        const newEnd = new Date(oldEnd.getTime() + 1800000); // +30 min

        fcEvent?.setEnd(newEnd);

        waitFor(() => expect(dispatch).toHaveBeenCalled());
      }
    });
  });

  const createPreloadedState = (eventProps = {}) => ({
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
          color: { light: "#FFFFFF", dark: "#000000" },
          ownerEmails: ["alice@example.com"],
          events: {
            event1: {
              id: "event1",
              calId: "667037022b752d0026472254/cal1",
              uid: "event1",
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString(),
              partstat: "ACCEPTED",
              organizer: {
                cn: "Alice",
                cal_address: "alice@example.com",
              },
              attendee: [
                {
                  cn: "Alice",
                  partstat: "ACCEPTED",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                  cal_address: "alice@example.com",
                },
              ],
              ...eventProps,
            },
          },
        },
      },
      pending: false,
    },
  });

  it("renders lock icon for private events on the calendar", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 120,
    });
    const preloadedState = createPreloadedState({
      class: "PRIVATE",
      title: "Private Event",
    });
    const mockCalendarRef = { current: null };
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );
    const card = screen.getByTestId("event-card-event1");
    const lockIcon = within(card).getByTestId("LockOutlineIcon");
    expect(lockIcon).toBeInTheDocument();
  });

  it("renders lock icon for confidential events on the calendar", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 120,
    });
    const preloadedState = createPreloadedState({
      class: "CONFIDENTIAL",
      title: "Confidential Event",
    });
    const mockCalendarRef = { current: null };
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );

    const card = screen.getByTestId("event-card-event1");
    const lockIcon = within(card).getByTestId("LockOutlineIcon");
    expect(lockIcon).toBeInTheDocument();
  });

  it("does NOT render a lock icon for public events on the calendar", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 120,
    });
    const preloadedState = createPreloadedState({
      class: "PUBLIC",
      title: "Public Event",
    });
    const mockCalendarRef = { current: null };
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );

    const card = screen.getByTestId("event-card-event1");
    const lockIcon = within(card).queryByTestId("LockOutlineIcon");
    expect(lockIcon).not.toBeInTheDocument();
  });

  it("does render a title for events without any attendees or user as organizer", async () => {
    const mockCalendarRef = { current: null };
    renderWithProviders(<CalendarApp calendarRef={mockCalendarRef} />, {
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
            color: { light: "#FF0000", dark: "#000" },
            ownerEmails: ["alice@example.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                start: new Date().toISOString(),
                end: new Date(Date.now() + 3600000).toISOString(),
                partstat: "ACCEPTED",
                organizer: {
                  cn: "Alice",
                  cal_address: "alice@example.com",
                },
                class: "PUBLIC",
                title: "Public Event",
              },
            },
          },
        },
        pending: false,
      },
    });

    expect(screen.getByText("Public Event")).toBeInTheDocument();
  });
  describe("BUGFIX", () => {
    const preloadedState = {
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
            color: { light: "#FFFFFF", dark: "#000000" },
            ownerEmails: ["alice@example.com"],
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Original Event",
                start: new Date("2025-11-14T10:31:00.000Z").toISOString(),
                end: new Date("2025-11-14T11:31:00.000Z").toISOString(),
                class: "PUBLIC",
                partstat: "ACCEPTED",
                sequence: 2,
                organizer: {
                  cn: "Alice",
                  cal_address: "alice@example.com",
                },
                attendee: [
                  {
                    cn: "Alice",
                    partstat: "ACCEPTED",
                    rsvp: "TRUE",
                    role: "CHAIR",
                    cutype: "INDIVIDUAL",
                    cal_address: "alice@example.com",
                  },
                  {
                    cn: "Bob",
                    partstat: "ACCEPTED",
                    rsvp: "TRUE",
                    role: "REQ-PARTICIPANT",
                    cutype: "INDIVIDUAL",
                    cal_address: "bob@example.com",
                  },
                ],
              },
            },
          },
        },
        pending: false,
      },
    };

    it("keeps all attendees event participation on title update", async () => {
      const updateSpy = jest.spyOn(eventThunks, "putEventAsync");
      const onClose = jest.fn();
      renderWithProviders(
        <EventUpdateModal
          eventId="event1"
          calId="667037022b752d0026472254/cal1"
          open={true}
          onClose={onClose}
          typeOfAction="solo"
        />,
        preloadedState
      );

      const titleInput = await screen.findByDisplayValue("Original Event");

      await act(async () => {
        fireEvent.change(titleInput, "Updated Event");
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await act(async () => {
        saveButton.click();
      });

      await waitFor(() => expect(updateSpy).toHaveBeenCalled());

      const dispatchedCalls = updateSpy.mock.calls;
      expect(dispatchedCalls.length).toBeGreaterThan(0);
      const updatedEvent = dispatchedCalls[0][0].newEvent;

      // Ensure organizer attendee info is preserved
      const organizerAttendee = updatedEvent?.attendee?.find(
        (a: any) => a.cal_address === "alice@example.com"
      );

      expect(organizerAttendee).toBeTruthy();
      expect(organizerAttendee?.partstat).toBe("ACCEPTED");
      expect(organizerAttendee?.role).toBe("CHAIR");

      // Ensure normal attendee info is preserved too
      const normalAttendee = updatedEvent?.attendee?.find(
        (a: any) => a.cal_address === "bob@example.com"
      );

      expect(normalAttendee).toBeTruthy();
      expect(normalAttendee?.partstat).toBe("ACCEPTED");
      expect(normalAttendee?.role).toBe("REQ-PARTICIPANT");

      // Verify SEQUENCE is incremented
      expect(updatedEvent?.sequence).toBe(3); // 2 + 1
    });

    it("changes normal attendee to need action on time update and no organizer changes", async () => {
      const updateSpy = jest.spyOn(eventThunks, "putEventAsync");
      const onClose = jest.fn();
      renderWithProviders(
        <EventUpdateModal
          eventId="event1"
          calId="667037022b752d0026472254/cal1"
          open={true}
          onClose={onClose}
          typeOfAction="solo"
        />,
        preloadedState
      );

      const startDateInput = await screen.findByTestId("start-time-input");

      await act(async () => {
        fireEvent.change(startDateInput, {
          target: { value: "08:00" },
        });
      });

      // Wait for the 0.1s delay in handleStartTimeChangeWithClose to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await act(async () => {
        saveButton.click();
      });

      await waitFor(() => expect(updateSpy).toHaveBeenCalled());

      const dispatchedCalls = updateSpy.mock.calls;
      expect(dispatchedCalls.length).toBeGreaterThan(0);
      const updatedEvent = dispatchedCalls[0][0].newEvent;

      // Ensure organizer attendee info is preserved
      const organizerAttendee = updatedEvent?.attendee?.find(
        (a: any) => a.cal_address === "alice@example.com"
      );

      expect(organizerAttendee).toBeTruthy();
      expect(organizerAttendee?.partstat).toBe("ACCEPTED");
      expect(organizerAttendee?.role).toBe("CHAIR");

      // Ensure normal attendee partstat is updated
      const normalAttendee = updatedEvent?.attendee?.find(
        (a: any) => a.cal_address === "bob@example.com"
      );

      expect(normalAttendee).toBeTruthy();
      expect(normalAttendee?.partstat).toBe("NEEDS-ACTION");
      expect(normalAttendee?.role).toBe("REQ-PARTICIPANT");

      // Verify SEQUENCE is incremented
      expect(updatedEvent?.sequence).toBe(3); // 2 + 1
    });
    it("update event attendees on drag", async () => {
      const mockDispatch = jest.fn();
      const updateSpy = jest.spyOn(eventThunks, "putEventAsync");

      const eventHandlers = createEventHandlers({
        setSelectedRange: jest.fn(),
        setOpenEventModal: jest.fn(),
        setTempEvent: jest.fn(),
        setOpenEventDisplay: jest.fn(),
        dispatch: mockDispatch,
        calendarRange: { start: new Date(), end: new Date() },
        setEventDisplayedId: jest.fn(),
        setEventDisplayedCalId: jest.fn(),
        setEventDisplayedTemp: jest.fn(),
        calendars: preloadedState.calendars.list,
        setSelectedEvent: jest.fn(),
        setAfterChoiceFunc: jest.fn(),
        setOpenEditModePopup: jest.fn(),
      } as unknown as EventHandlersProps);

      const mockArg = {
        event: {
          _def: {
            extendedProps: {
              uid: "event1",
              calId: "667037022b752d0026472254/cal1",
            },
          },
        },
        // drag event → move by 1 day
        delta: { years: 0, months: 0, days: 1, milliseconds: 0 },
      };

      renderCalendar();
      eventHandlers.handleEventDrop(mockArg);

      expect(updateSpy).toHaveBeenCalled();

      // Extract the dispatched update event
      const dispatched = updateSpy.mock.calls[0];

      expect(dispatched).toBeTruthy();

      const updatePayload = dispatched[0];
      const updatedEvent = updatePayload.newEvent;

      // Organizer should remain unchanged
      const organizer = updatedEvent.attendee.find(
        (a: any) => a.cal_address === "alice@example.com"
      );
      expect(organizer?.partstat).toBe("ACCEPTED");

      // Normal attendee must become NEEDS-ACTION
      const normal = updatedEvent.attendee.find(
        (a: any) => a.cal_address === "bob@example.com"
      );
      expect(normal?.partstat).toBe("NEEDS-ACTION");

      // Verify SEQUENCE is incremented
      expect(updatedEvent?.sequence).toBe(3); // 2 + 1
    });

    it("update event attendees on resize", async () => {
      const mockDispatch = jest.fn();
      const updateSpy = jest.spyOn(eventThunks, "putEventAsync");

      const eventHandlers = createEventHandlers({
        setSelectedRange: jest.fn(),
        setOpenEventModal: jest.fn(),
        setTempEvent: jest.fn(),
        setOpenEventDisplay: jest.fn(),
        dispatch: mockDispatch,
        calendarRange: { start: new Date(), end: new Date() },
        setEventDisplayedId: jest.fn(),
        setEventDisplayedCalId: jest.fn(),
        setEventDisplayedTemp: jest.fn(),
        calendars: preloadedState.calendars.list,
        setSelectedEvent: jest.fn(),
        setAfterChoiceFunc: jest.fn(),
        setOpenEditModePopup: jest.fn(),
      } as unknown as EventHandlersProps);

      const mockArg = {
        event: {
          _def: {
            extendedProps: {
              uid: "event1",
              calId: "667037022b752d0026472254/cal1",
            },
          },
        },
        startDelta: { years: 0, months: 0, days: 0, milliseconds: 0 },
        endDelta: { years: 0, months: 0, days: 0, milliseconds: 3600000 }, // 1 hour
      };

      renderCalendar();
      eventHandlers.handleEventResize(mockArg);

      expect(updateSpy).toHaveBeenCalled();

      // Extract the dispatched update event
      const dispatched = updateSpy.mock.calls[0];

      expect(dispatched).toBeTruthy();

      const updatePayload = dispatched[0];
      const updatedEvent = updatePayload.newEvent;

      // Organizer should remain unchanged
      const organizer = updatedEvent.attendee.find(
        (a: any) => a.cal_address === "alice@example.com"
      );
      expect(organizer?.partstat).toBe("ACCEPTED");

      // Normal attendee must become NEEDS-ACTION
      const normal = updatedEvent.attendee.find(
        (a: any) => a.cal_address === "bob@example.com"
      );
      expect(normal?.partstat).toBe("NEEDS-ACTION");

      // Verify SEQUENCE is incremented
      expect(updatedEvent?.sequence).toBe(3); // 2 + 1
    });
  });
});
