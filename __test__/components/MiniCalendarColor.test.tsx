import { renderWithProviders } from "../utils/Renderwithproviders";
import { fireEvent, screen } from "@testing-library/react";
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
            color: "#FF0000",
            events: {
              event1: {
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
    renderWithProviders(<CalendarApp />, preloadedState);
  };

  it("renders mini calendar with today in orange", async () => {
    renderCalendar();
    const today = new Date().getDate().toString();
    const todayTile = screen
      .getAllByText(today)
      .find((el) => el.tagName.toLowerCase() === "abbr");
    expect(todayTile?.parentElement).toHaveClass("today");
  });

  it("renders mini calendar with the week in gray (except for today) when full calendar in week view", async () => {
    renderCalendar();
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      const tile = screen
        .getAllByText(date.getDate())
        .find((el) => el.tagName.toLowerCase() === "abbr");
      if (date.getTime() !== today.setHours(0, 0, 0, 0)) {
        expect(tile?.parentElement).toHaveClass("selectedWeek");
      }
    }
  });

  it("renders mini calendar with the day in gray (except for today) when full calendar in day view", async () => {
    renderCalendar();

    // Simulate switching to day view
    const dayViewButton = await screen.findByTitle(/day view/i);
    fireEvent.click(dayViewButton);

    const today = new Date().getDate().toString();
    const todayTile = screen
      .getAllByText(today)
      .find((el) => el.tagName.toLowerCase() === "abbr");
    expect(todayTile?.parentElement).toHaveClass("selectedWeek");
  });

  it("renders mini calendar with nothing colored (except for today) when full calendar in month view", async () => {
    renderCalendar();

    // Switch to month view
    const monthButton = await screen.findByRole("button", { name: /month/i });
    fireEvent.click(monthButton);

    const tiles = await screen.findAllByRole("gridcell");

    tiles.forEach((tile) => {
      if (!tile.classList.contains("today")) {
        expect(tile.className).not.toContain("selectedWeek");
      }
    });
  });

  it("renders mini calendar with dots on days with personal events", async () => {
    renderCalendar();

    const dot = document.querySelector(".event-dot");
    console.log(dot?.parentElement?.children[0].innerHTML);
    expect(dot?.parentElement?.children[0].innerHTML).toBe(
      day.getDate().toString()
    );
    expect(dot).toBeInTheDocument();
  });
});
