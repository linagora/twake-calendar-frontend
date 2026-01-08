import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/Renderwithproviders";
import CalendarLayout from "../../src/components/Calendar/CalendarLayout";

describe("Event Error Handling", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  const erroredState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "mockSid",
        openpaasId: "user1",
      },
      tokens: { accessToken: "token" },
    },
    calendars: {
      list: {
        "user1/cal1": {
          name: "Calendar personal",
          id: "user1/cal1",
          color: { light: "#FF0000", dark: "#000" },
          ownerEmails: ["alice@example.com"],
          events: {
            event1: {
              id: "event1",
              calId: "user1/cal1",
              uid: "event1",
              title: "Test Event",
              start: start.toISOString(),
              end: start.toISOString(),
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

  it("BUGFIX: does not re-report errors after clearing error snackbar", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    await act(async () =>
      renderWithProviders(<CalendarLayout />, erroredState)
    );

    await waitFor(
      () => {
        expect(screen.getByText("Test Event"));
        expect(screen.getByRole("alert")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    const closeButton = screen.queryByRole("button", { name: "common.ok" });

    if (closeButton) {
      const initialWarnCount = consoleWarnSpy.mock.calls.length;

      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(
        () => {
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const afterCloseWarnCount = consoleWarnSpy.mock.calls.length;

      expect(afterCloseWarnCount).toBe(initialWarnCount);
    }

    consoleWarnSpy.mockRestore();
  });
});
