import { CalendarApi } from "@fullcalendar/core";
import { jest } from "@jest/globals";
import { ThunkDispatch } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
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
    jest.useFakeTimers(); // optional
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
            color: "#FF0000",
            events: {
              event1: {
                id: "event1",
                calId: "667037022b752d0026472254/cal1",
                uid: "event1",
                title: "Test Event",
                start: start.toISOString(),
                end: end.toISOString(),
              },
            },
          },
        },
        pending: false,
      },
    };

    renderWithProviders(<CalendarApp />, preloadedState);
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

    if (calendarApi) {
      const fcEvent = calendarApi.getEventById("event1");
      expect(fcEvent?.title).toBe("Test Event");
      const oldEnd = new Date(today.getTime() + 3600000); // +1 hour
      const newEnd = new Date(oldEnd.getTime() + 1800000); // +30 min

      fcEvent?.setEnd(newEnd);

      expect(dispatch).toHaveBeenCalled();
    }
  });
});
