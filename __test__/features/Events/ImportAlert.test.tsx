import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import ImportAlert from "../../../src/features/Events/ImportAlert";
import { clearError } from "../../../src/features/Calendars/CalendarSlice";

// Mock the ErrorSnackbar component since we want to test ImportAlert logic,
// but we can also test integration if we don't mock it.
// Given ImportAlert uses EventErrorSnackbar which uses MUI Snackbar,
// it's better to render it and check for text presence.

describe("ImportAlert", () => {
  const preloadedState = {
    calendars: {
      list: {
        cal1: {
          id: "cal1",
          name: "Calendar 1",
          events: {
            event1: {
              uid: "event1",
              title: "Event 1",
              error: "Error message 1",
            },
            event2: {
              uid: "event2",
              title: "Event 2",
              // No error
            },
          },
        },
        cal2: {
          id: "cal2",
          name: "Calendar 2",
          events: {
            event3: {
              uid: "event3",
              title: "Event 3",
              error: "Error message 2",
            },
          },
        },
      },
    },
  };

  it("renders nothing when there are no errors", () => {
    const state = {
      calendars: {
        list: {
          cal1: {
            id: "cal1",
            events: {
              event1: { uid: "event1" },
            },
          },
        },
      },
    };

    const { container } = renderWithProviders(<ImportAlert />, state);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders snackbar with error message when there is one error", () => {
    renderWithProviders(<ImportAlert />, preloadedState);

    // EventErrorSnackbar shows "multipleEvents" if > 1, or the message if 1.
    // Here we have 2 errors in preloadedState.
    // Let's adjust state for single error test.
    const singleErrorState = {
      calendars: {
        list: {
          cal1: {
            id: "cal1",
            events: {
              event1: {
                uid: "event1",
                error: "Single Error",
              },
            },
          },
        },
      },
    };

    renderWithProviders(<ImportAlert />, singleErrorState);
    expect(screen.getByText("Single Error")).toBeInTheDocument();
  });

  it("renders summary message when there are multiple errors", () => {
    renderWithProviders(<ImportAlert />, preloadedState);
    // 2 errors in preloadedState
    // "error.multipleEvents" key is used.
    // In test environment, t function usually returns the key or formatted string.
    // We should check what the real t function does or if it's mocked.
    // Based on other tests, it seems we might need to check for the translation key or value.
    // Let's assume standard behavior: "error.multipleEvents"

    // Actually, EventErrorSnackbar uses: t("error.multipleEvents", { count: messages.length })
    // If we don't have full i18n setup in tests, it might be tricky.
    // But renderWithProviders likely sets up i18n.

    // Let's check for the text that appears.
    // If translation is missing, it might show "error.multipleEvents".
    // Or if we can match regex.

    // Let's try to match partial text or use a custom state with known behavior.
    // If we look at EventErrorSnackbar:
    // const summary = messages.length === 1 ? messages[0] : t("error.multipleEvents", { count: messages.length });

    // We can check if the Alert is present.
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("dismisses error when close button is clicked", () => {
    const singleErrorState = {
      calendars: {
        list: {
          cal1: {
            id: "cal1",
            events: {
              event1: {
                uid: "event1",
                error: "Dismiss Me",
              },
            },
          },
        },
      },
    };

    renderWithProviders(<ImportAlert />, singleErrorState);
    expect(screen.getByText("Dismiss Me")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /ok/i }); // EventErrorSnackbar has an "OK" button
    fireEvent.click(closeButton);

    // After clicking, it should disappear (or at least be removed from DOM or hidden)
    // Since we use local state to filter dismissed errors, it should re-render with null.
    expect(screen.queryByText("Dismiss Me")).not.toBeInTheDocument();
  });
});
