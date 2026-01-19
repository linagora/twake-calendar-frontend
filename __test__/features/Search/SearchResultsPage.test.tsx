import { screen } from "@testing-library/react";
import SearchResultsPage from "@/features/Search/SearchResultsPage";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("SearchResultsPage", () => {
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
          color: { light: "#FF0000", dark: "#000" },
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
          color: { light: "#FF0000", dark: "#000" },
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

  it("should show loading spinner when loading", () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: { loading: true, error: null, hits: 0, results: [] },
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show error message when error occurs", () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: {
        loading: false,
        error: "Network error",
        hits: 0,
        results: [],
      },
    });
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("should show no results message when no hits", () => {
    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: { loading: false, error: null, hits: null, results: [] },
    });
    expect(screen.getByText("search.noResults")).toBeInTheDocument();
  });

  it("should render search results", () => {
    const mockResults = [
      {
        data: {
          uid: "1",
          summary: "Team Meeting",
          start: "2025-06-26T15:00:00Z",
          organizer: { cn: "John Doe", email: "john@example.com" },
          allDay: false,
        },
      },
      {
        data: {
          uid: "2",
          summary: "Project Review",
          start: "2025-06-27T10:00:00Z",
          organizer: { cn: "Jane Smith", email: "jane@example.com" },
          allDay: false,
        },
      },
    ];

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: { results: mockResults, hits: 2 },
    });
    expect(screen.getByText("search.resultsTitle")).toBeInTheDocument();
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Project Review")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should handle events without organizer", () => {
    const mockResults = [
      {
        data: {
          uid: "1",
          summary: "Untitled Event",
          start: "2025-06-26T15:00:00Z",
          allDay: false,
        },
      },
    ];

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: { results: mockResults, hits: 1 },
    });

    expect(screen.getByText("Untitled Event")).toBeInTheDocument();
  });

  it("should format all-day events correctly", () => {
    const mockResults = [
      {
        data: {
          uid: "1",
          summary: "All Day Event",
          start: "2025-06-26T00:00:00Z",
          organizer: { cn: "Organizer" },
          allDay: true,
        },
      },
    ];

    renderWithProviders(<SearchResultsPage />, {
      ...preloadedState,
      searchResult: { results: mockResults, hits: 1 },
    });

    expect(screen.getByText("All Day Event")).toBeInTheDocument();
  });
});
