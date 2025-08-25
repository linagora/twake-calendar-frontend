import { renderWithProviders } from "../utils/Renderwithproviders";
import { fireEvent, screen } from "@testing-library/react";
import { jest } from "@jest/globals";
import CalendarApp from "../../src/components/Calendar/Calendar";
import * as appHooks from "../../src/app/hooks";
import { ThunkDispatch } from "@reduxjs/toolkit";
import preview from "jest-preview";

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
            color: "#FF0000",
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
    renderWithProviders(<CalendarApp />, preloadedState);
  };

  it("renders mini calendar with today in orange", async () => {
    renderCalendar();
    const today = new Date();
    const dateTestId = `date-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    const todayTile = screen.getByTestId(dateTestId);
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
      const dateTestId = `date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      const tile = screen.getByTestId(dateTestId);

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

    const today = new Date();
    const dateTestId = `date-${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    const todayTile = screen.getByTestId(dateTestId);
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
    expect(dot?.parentElement?.children[0].innerHTML).toBe(
      day.getDate().toString()
    );
    expect(dot).toBeInTheDocument();
  });
});

describe("Found Bugs", () => {
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
            ownerEmails: ["test.test@test.com"],
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
    renderWithProviders(<CalendarApp />, preloadedState);
  };

  it("gray day stays when day mode, click today, then change the month bar to august and come back to july", async () => {
    renderCalendar();
    const dayViewButton = await screen.findByTitle(/day view/i);
    fireEvent.click(dayViewButton);
    const nextMonthButton = screen.getByText(">");
    const previousMonthButton = screen.getByText("<");
    fireEvent.click(nextMonthButton);
    fireEvent.click(previousMonthButton);
    const selectedTile = screen.getByText((content, element) => {
      return element?.className.includes("selectedWeek") ?? false;
    });
    const ariaLabel = screen.getByRole("columnheader");
    const shownDayDate = new Date(
      ariaLabel.getAttribute("data-date") as string
    );
    const dateTestId = `date-${shownDayDate.getFullYear()}-${shownDayDate.getMonth()}-${shownDayDate.getDate()}`;

    const supposedSelectedTile = screen.getByTestId(dateTestId);

    expect(selectedTile.children[0].innerHTML).toBe(
      supposedSelectedTile.parentElement?.children[0]?.innerHTML
    );
    expect(supposedSelectedTile?.parentElement).toHaveClass("selectedWeek");
  });

  it("in month view going to next month, side panel is not updated on second click to following month both components are updated with the side panel view jumping 2 months", async () => {
    renderCalendar();

    const monthViewButton = await screen.findByTitle(/month view/i);
    fireEvent.click(monthViewButton);
    const nextMonthButton = await screen.findByTitle(/Next month/i);
    const previousMonthButton = await screen.findByTitle(/Previous month/i);
    fireEvent.click(nextMonthButton);
    const miniCalMonth = await screen.findByTitle(/mini calendar month/i);
    const fullCalMonth = screen.getByText((content, element) => {
      return element?.className.includes("fc-toolbar-title") ?? false;
    });
    expect(miniCalMonth.innerHTML).toBe(fullCalMonth.innerHTML);
    fireEvent.click(nextMonthButton);
    expect(miniCalMonth.innerHTML).toBe(fullCalMonth.innerHTML);
  });

  it("gray day stays when day mode, change day, then change to week view", async () => {
    renderCalendar();
    const dayViewButton = await screen.findByTitle(/day view/i);
    const weekViewButton = await screen.findByTitle(/week view/i);
    fireEvent.click(dayViewButton);
    const nextDayButton = screen.getByTitle("Next day");
    fireEvent.click(nextDayButton);

    const dayViewSelectedTiles = screen.getAllByText((content, element) => {
      return element?.className.includes("selectedWeek") ?? false;
    });

    expect(dayViewSelectedTiles).toHaveLength(1);

    fireEvent.click(weekViewButton);

    const weekViewSelectedTiles = screen.getAllByText((content, element) => {
      return element?.className.includes("selectedWeek") ?? false;
    });

    expect(weekViewSelectedTiles).toHaveLength(7);
  });
  it("gray day stays when day mode, change day, then change to week view", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2025-01-30"));
    renderCalendar();
    const nextWeekButton = screen.getByTitle("Next week");

    fireEvent.click(nextWeekButton);

    const miniCalMonth = await screen.findByTitle(/mini calendar month/i);
    const fullCalMonth = screen.getByText((content, element) => {
      return element?.className.includes("fc-toolbar-title") ?? false;
    });
    expect(miniCalMonth.innerHTML).toBe(fullCalMonth.innerHTML);
  });
});
