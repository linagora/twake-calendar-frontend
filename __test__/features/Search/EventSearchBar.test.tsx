import { fireEvent, screen, waitFor } from "@testing-library/react";
import SearchBar from "../../../src/components/Menubar/EventSearchBar";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import * as searchThunk from "../../../src/features/Search/SearchSlice";
import userEvent from "@testing-library/user-event";

describe("EventSearchBar", () => {
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

  it("should render search icon button initially", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    expect(searchButton).toBeInTheDocument();
  });

  it("should expand search bar when icon is clicked", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    expect(searchInput).toBeInTheDocument();
  });

  it("should unexpand search bar when field is unfocused and empty", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    fireEvent.blur(searchInput);
    expect(searchInput).not.toBeInTheDocument();
  });

  it("should not unexpand search bar when field is unfocused but not empty", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    userEvent.type(searchInput, "test");
    fireEvent.blur(searchInput);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue("test");
  });

  it("should update search value on input", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    fireEvent.change(searchInput, { target: { value: "meeting" } });

    expect(searchInput).toHaveValue("meeting");
  });

  it("should open filter popover when tune icon is clicked", async () => {
    renderWithProviders(<SearchBar />, preloadedState);

    // Expand search bar
    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    // Click tune icon
    const tuneButtons = screen.getAllByRole("button");
    const tuneButton = tuneButtons.find((btn) =>
      btn.querySelector('[data-testid="TuneIcon"]')
    );
    if (tuneButton) fireEvent.click(tuneButton);

    await waitFor(() => {
      expect(screen.getByText("search.searchIn")).toBeInTheDocument();
    });
  });

  it("should clear search value when clear button is clicked", () => {
    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    fireEvent.change(searchInput, { target: { value: "meeting" } });

    const clearButton = screen.getByTestId("HighlightOffIcon");
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue("");
  });

  it("should trigger search on Enter key", async () => {
    const searchSpy = jest.spyOn(searchThunk, "searchEventsAsync");

    renderWithProviders(<SearchBar />, preloadedState);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText("common.search");
    fireEvent.change(searchInput, { target: { value: "test" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith({
        filters: {
          keywords: "test",
          organizers: [],
          attendees: [],
          searchIn: ["user1/cal1"],
        },
        search: "test",
      });
    });
  });
});
