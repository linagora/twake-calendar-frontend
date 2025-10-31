import { renderWithProviders } from "../utils/Renderwithproviders";
import { screen } from "@testing-library/react";
import { jest } from "@jest/globals";
import CalendarApp from "../../src/components/Calendar/Calendar";
import * as appHooks from "../../src/app/hooks";
import { ThunkDispatch } from "@reduxjs/toolkit";

describe("MiniCalendar", () => {
  const day = new Date();
  beforeEach(() => {
    jest.clearAllMocks();
    const dispatch = jest.fn() as ThunkDispatch<any, any, any>;
    jest.spyOn(appHooks, "useAppDispatch").mockReturnValue(dispatch);
    jest.useFakeTimers().clearAllTimers();
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
      },
      calendars: {
        list: {
          "667037022b752d0026472254/cal1": {
            name: "Calendar 1",
            color: { light: "#FF0000", dark: "#000" },
            ownerEmails: ["test@test.com"],
            events: {
              event1: {
                calId: "667037022b752d0026472254/cal1",
                id: "event1",
                title: "Test Event",
                start: day.toISOString(),
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

  it("renders mini calendar with today in orange", async () => {
    renderCalendar();
    const today = new Date();
    const dateTestId = `date-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    const todayTile = screen.getByTestId(dateTestId);
    expect(todayTile).toHaveClass("today");
  });
});
