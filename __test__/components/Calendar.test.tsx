import { fireEvent, screen, waitFor } from "@testing-library/react";
import CalendarApp from "../../src/components/Calendar/Calendar";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../utils/Renderwithproviders";

describe("CalendarSelection", () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "mockSid",
        openpaasId: "user1",
      },
      tokens: { accessToken: "token" }, // required to avoid redirect
    },
    calendars: {
      list: {
        "user1/cal1": {
          name: "Calendar personnal",
          id: "user1/cal1",
          color: "#FF0000",
          ownerEmails: ["alice@example.com"],
          events: {
            event1: {
              id: "event1",
              calId: "user1/cal1",
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
        "user2/cal1": {
          name: "Calendar delegated",
          delegated: true,
          id: "user2/cal1",
          color: "#FF0000",
          ownerEmails: ["alice@example.com"],
          events: {
            event1: {
              id: "event1",
              calId: "user2/cal1",
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
        "user3/cal1": {
          name: "Calendar shared",
          id: "user3/cal1",
          color: "#FF0000",
          ownerEmails: ["alice@example.com"],
          events: {
            event1: {
              id: "event1",
              calId: "user3/cal1",
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
  it("renders calendars", async () => {
    renderWithProviders(<CalendarApp />, preloadedState);
    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Shared Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();
  });
  it("refresh calendars", async () => {
    const spy = jest
      .spyOn(eventThunks, "getCalendarDetailAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderWithProviders(<CalendarApp />, preloadedState);

    const refreshButton = screen.getByRole("button", {
      name: "↻",
    });

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
});
