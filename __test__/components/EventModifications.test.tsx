import { CalendarApi } from "@fullcalendar/core";
import { jest } from "@jest/globals";
import { ThunkDispatch } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import * as appHooks from "../../src/app/hooks";
import CalendarApp from "../../src/components/Calendar/Calendar";
import { renderWithProviders } from "../utils/Renderwithproviders";

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
                color: { light: "#FFFFFF", dark: "#000000" },
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
              color: { light: "#FFFFFF", dark: "#000000" },
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
            color: "#FF0000",
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
});
