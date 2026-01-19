import { fireEvent, screen, waitFor } from "@testing-library/react";
import CalendarApp from "@/components/Calendar/Calendar";
import { updateSlotLabelVisibility } from "@/components/Calendar/utils/calendarUtils";
import EventPreviewModal from "@/features/Events/EventDisplayPreview";
import * as SettingsSlice from "@/features/Settings/SettingsSlice";
import * as calendarUtils from "@/components/Calendar/utils/calendarUtils";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("Calendar - Timezone Integration", () => {
  const mockCalendarRef = { current: null };

  const baseState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "testSid",
        openpaasId: "user1",
      },
    },
    calendars: {
      list: {
        "user1/cal1": {
          id: "user1/cal1",
          link: "/calendars/user1/cal1.json",
          name: "Test Calendar",
          description: "",
          color: "#33B679",
          owner: "user1",
          ownerEmails: ["test@test.com"],
          visibility: "public",
          events: {},
        },
      },
      timeZone: "America/New_York",
      pending: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders TimezoneSelector in week view", async () => {
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      baseState
    );

    // Look for timezone selector button (should show offset)
    await waitFor(() => {
      expect(screen.getByText(/UTC/)).toBeInTheDocument();
    });
  });

  it("dispatches setTimeZone action when timezone is changed", async () => {
    const setTimeZoneSpy = jest.spyOn(SettingsSlice, "setTimeZone");

    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      baseState
    );

    // Find and click timezone selector
    await waitFor(() => {
      const timezoneButton = screen.getByText(/UTC/i);
      fireEvent.click(timezoneButton);

      // Select a different timezone
      const autocomplete = screen.getByRole("combobox");
      fireEvent.change(autocomplete, { target: { value: "Tokyo" } });
    });
    const option = await screen.findByText(/Tokyo/i);
    fireEvent.click(option);

    expect(setTimeZoneSpy).toHaveBeenCalledWith("Asia/Tokyo");
  });
});

describe("Calendar - Timezone Slot Label Visibility", () => {
  it("hides slot labels within 15 minutes of current time", () => {
    const currentTime = new Date("2025-01-15T14:30:00Z");
    const timezone = "UTC";
    jest
      .spyOn(calendarUtils, "checkIfCurrentWeekOrDay")
      .mockImplementation(() => true);

    // 14:25 - within 15 minutes
    const slot1425 = { text: "14:25" };
    expect(updateSlotLabelVisibility(currentTime, slot1425, timezone)).toBe(
      "timegrid-slot-label-hidden"
    );

    // 14:30 - exact match
    const slot1430 = { text: "14:30" };
    expect(updateSlotLabelVisibility(currentTime, slot1430, timezone)).toBe(
      "timegrid-slot-label-hidden"
    );

    // 14:35 - within 15 minutes
    const slot1435 = { text: "14:35" };
    expect(updateSlotLabelVisibility(currentTime, slot1435, timezone)).toBe(
      "timegrid-slot-label-hidden"
    );
  });

  it("shows slot labels more than 15 minutes from current time", () => {
    jest
      .spyOn(calendarUtils, "checkIfCurrentWeekOrDay")
      .mockImplementation(() => true);

    const currentTime = new Date("2025-01-15T14:30:00");
    const timezone = "UTC";

    // 14:00 - 30 minutes before
    const slot1400 = { text: "14:00" };
    expect(updateSlotLabelVisibility(currentTime, slot1400, timezone)).toBe(
      "fc-timegrid-slot-label"
    );

    // 15:00 - 30 minutes after
    const slot1500 = { text: "15:00" };
    expect(updateSlotLabelVisibility(currentTime, slot1500, timezone)).toBe(
      "fc-timegrid-slot-label"
    );
  });

  it("returns visible class when not in current week/day", () => {
    jest
      .spyOn(calendarUtils, "checkIfCurrentWeekOrDay")
      .mockImplementation(() => false);
    const currentTime = new Date("2025-01-15T14:30:00");
    const timezone = "UTC";
    const slot = { text: "14:30" };

    // Should return visible class when not in current view
    const result = updateSlotLabelVisibility(currentTime, slot, timezone);
    expect(result).toBe("fc-timegrid-slot-label");
  });
});

describe("EventDisplayPreview - Timezone Display", () => {
  const mockOnClose = jest.fn();

  const baseEvent: CalendarEvent = {
    uid: "event1",
    title: "Team Meeting",
    start: new Date("2025-01-15T14:00:00Z"),
    end: new Date("2025-01-15T15:00:00Z"),
    calendarId: "user1/cal1",
    allday: false,
  };

  const allDayEvent = {
    ...baseEvent,
    allday: true,
    start: new Date("2025-01-15"),
    end: new Date("2025-01-16"),
  };

  const baseState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "testSid",
        openpaasId: "user1",
      },
    },
    calendars: {
      list: {
        "user1/cal1": {
          id: "user1/cal1",
          name: "Test Calendar",
          color: "#33B679",
          owner: "user1",
          ownerEmails: ["test@test.com"],
          visibility: "public",
          events: {
            event1: baseEvent,
            allDayEvent,
          },
        },
      },
      timeZone: "America/New_York",
      pending: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not show timezone offset for all-day events", async () => {
    renderWithProviders(
      <EventPreviewModal
        open={true}
        onClose={mockOnClose}
        eventId="allDayEvent"
        calId="user1/cal1"
        event={allDayEvent}
      />,
      baseState
    );

    await waitFor(() => {
      const title = screen.getByText(/Team Meeting/i);
      expect(title).toBeInTheDocument();
    });

    // Should not show UTC offset
    expect(screen.queryByText(/UTC[+-]\d+/i)).not.toBeInTheDocument();
  });

  it("displays correct timezone offset for different timezones", async () => {
    const timezones = [
      { tz: "America/New_York", expectedOffset: /UTC[-−][45]/ },
      { tz: "Europe/Paris", expectedOffset: /UTC\+[12]/ },
      { tz: "Asia/Tokyo", expectedOffset: /UTC\+9/ },
      { tz: "Australia/Sydney", expectedOffset: /UTC\+1[01]/ },
      { tz: "Asia/Kolkata", expectedOffset: /UTC\+5:30/ },
    ];

    for (const { tz, expectedOffset } of timezones) {
      const state = {
        ...baseState,
        settings: {
          timeZone: tz,
        },
      };

      renderWithProviders(
        <EventPreviewModal
          open={true}
          eventId="event1"
          calId="user1/cal1"
          onClose={mockOnClose}
          event={baseEvent}
        />,
        state
      );

      await waitFor(() => {
        const content = document.body.textContent || "";
        expect(content).toMatch(expectedOffset);
      });
    }
  });
});
