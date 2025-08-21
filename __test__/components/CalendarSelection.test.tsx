import { CalendarApi } from "@fullcalendar/core";
import { jest } from "@jest/globals";
import { ThunkDispatch } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import * as appHooks from "../../src/app/hooks";
import CalendarApp from "../../src/components/Calendar/Calendar";
import { renderWithProviders } from "../utils/Renderwithproviders";
import CalendarSelection from "../../src/components/Calendar/CalendarSelection";

describe("CalendarSelection", () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  it("renders the all the calendars in list", async () => {
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
    renderWithProviders(<CalendarApp />, preloadedState);
    expect(screen.getByText("personnalCalendars")).toBeInTheDocument();
    expect(screen.getByText("delegatedCalendars")).toBeInTheDocument();
    expect(screen.getByText("sharedCalendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();
  });
  it("renders only personnal calendars in list", async () => {
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
        },
        pending: false,
      },
    };
    renderWithProviders(<CalendarApp />, preloadedState);
    expect(screen.getByText("personnalCalendars")).toBeInTheDocument();
    expect(screen.queryByText("delegatedCalendars")).not.toBeInTheDocument();
    expect(screen.queryByText("sharedCalendars")).not.toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
  });
});
