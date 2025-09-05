import { screen, fireEvent, waitFor } from "@testing-library/react";
import RepeatEvent from "../../src/components/Event/EventRepeat";
import { RepetitionObject } from "../../src/features/Events/EventsTypes";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/Renderwithproviders";
import EventPopover from "../../src/features/Events/EventModal";
import { DateSelectArg } from "@fullcalendar/core";
import { formatDateToYYYYMMDDTHHMMSS } from "../../src/utils/dateUtils";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import * as apiUtils from "../../src/utils/apiUtils";

describe("RepeatEvent", () => {
  const baseRepetition: RepetitionObject = {
    freq: "",
    interval: 1,
    occurrences: 0,
    endDate: "",
    selectedDays: [],
  };

  const setup = (props?: Partial<RepetitionObject>, preloadedState?: any) => {
    const setRepetition = jest.fn();
    renderWithProviders(
      <RepeatEvent
        repetition={{ ...baseRepetition, ...props }}
        setRepetition={setRepetition}
        isOwn={true}
      />,
      preloadedState
    );
    return { setRepetition };
  };

  it("renders with no repetition by default", () => {
    setup();
    expect(screen.getByLabelText(/repetition/i)).toBeInTheDocument();
    expect(screen.queryByText(/daily/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/weekly/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/monthly/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/yearly/i)).not.toBeInTheDocument();
  });

  it("allows selecting repetition frequency", async () => {
    const { setRepetition } = setup();
    const select = screen.getByLabelText(/repetition/i);
    userEvent.click(select);
    userEvent.click(await screen.findByText(/repeat weekly/i));
    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ freq: "weekly" })
    );
  });

  it("renders interval input when frequency is selected", () => {
    setup({ freq: "daily", interval: 2 });
    expect(screen.getByText(/interval/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  it("updates interval value", () => {
    const { setRepetition } = setup({ freq: "daily", interval: 1 });
    const input = screen.getByDisplayValue("1");
    fireEvent.change(input, { target: { value: "5" } });
    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 5 })
    );
  });

  it("toggles day selection for weekly frequency", () => {
    const { setRepetition } = setup({ freq: "weekly", selectedDays: [] });
    const mondayCheckbox = screen.getByLabelText("MO");
    userEvent.click(mondayCheckbox);
    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDays: ["MO"] })
    );
  });
});

describe("Repeat Event api calls", () => {
  const mockOnClose = jest.fn();
  const mockSetSelectedRange = jest.fn();
  const mockCalendarRef = { current: { select: jest.fn() } } as any;

  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
        openpaasId: "667037022b752d0026472254",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
    },
    calendars: {
      list: {
        "667037022b752d0026472254/cal1": {
          id: "667037022b752d0026472254/cal1",
          name: "Calendar 1",
          color: "#FF0000",
        },
        "667037022b752d0026472254/cal2": {
          id: "667037022b752d0026472254/cal2",
          name: "Calendar 2",
          color: "#00FF00",
        },
      },
      pending: false,
    },
  };

  const defaultSelectedRange = {
    startStr: "2025-07-18T09:00",
    endStr: "2025-07-18T10:00",
    start: new Date("2025-07-18T09:00"),
    end: new Date("2025-07-18T10:00"),
    allDay: false,
    resource: undefined,
  } as unknown as DateSelectArg;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  it("Given XYZ input in the component, data in CalendarEvent is correct", async () => {
    renderWithProviders(
      <EventPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        selectedRange={defaultSelectedRange}
        setSelectedRange={mockSetSelectedRange}
        calendarRef={mockCalendarRef}
      />,
      preloadedState
    );
    const newEvent = {
      title: "Meeting",
      start: "2025-07-18T00:00:00.000Z",
      end: "2025-07-19T00:00:00.000Z",
      allday: false,
      uid: "6045c603-11ab-43c5-bc30-0641420bb3a8",
      organizer: { cn: "test", cal_address: "test@test.com" },
      repetition: { freq: "weekly" },
    };

    // Fill inputs
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: newEvent.title },
    });
    fireEvent.click(screen.getByLabelText("All day"));
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: newEvent.start.split("T")[0] },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: newEvent.end.split("T")[0] },
    });

    fireEvent.click(screen.getByText("Show More"));

    const select = screen.getByLabelText(/repetition/i);
    userEvent.click(select);
    userEvent.click(await screen.findByText(/repeat weekly/i));

    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const receivedPayload = spy.mock.calls[0][0];
    expect(receivedPayload.cal).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"]
    );

    expect(receivedPayload.newEvent.title).toBe(newEvent.title);
    expect(
      formatDateToYYYYMMDDTHHMMSS(receivedPayload.newEvent.start).split("T")[0]
    ).toBe(formatDateToYYYYMMDDTHHMMSS(new Date(newEvent.start)).split("T")[0]);
    expect(
      formatDateToYYYYMMDDTHHMMSS(
        receivedPayload.newEvent.end || new Date()
      ).split("T")[0]
    ).toBe(formatDateToYYYYMMDDTHHMMSS(new Date(newEvent.end)).split("T")[0]);
    expect(receivedPayload.newEvent.organizer).toEqual(newEvent.organizer);
    expect(receivedPayload.newEvent.repetition).toEqual(newEvent.repetition);
    expect(receivedPayload.newEvent.color).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].color
    );

    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("Given XYZ input in the component, data in api call is correct", async () => {
    jest
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("bfe2c579-acce-456b-8b91-c557bb3b4f89");
    renderWithProviders(
      <EventPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        selectedRange={defaultSelectedRange}
        setSelectedRange={mockSetSelectedRange}
        calendarRef={mockCalendarRef}
      />,
      preloadedState
    );
    const newEvent = {
      title: "Meeting",
      start: "2025-07-18T00:00:00.000Z",
      end: "2025-07-19T00:00:00.000Z",
      allday: false,
      uid: "6045c603-11ab-43c5-bc30-0641420bb3a8",
      organizer: { cn: "test", cal_address: "test@test.com" },
      repetition: { freq: "weekly" },
    };

    // Fill inputs
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: newEvent.title },
    });
    fireEvent.click(screen.getByLabelText("All day"));
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: newEvent.start.split("T")[0] },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: newEvent.end.split("T")[0] },
    });

    fireEvent.click(screen.getByText("Show More"));

    const select = screen.getByLabelText(/repetition/i);
    userEvent.click(select);
    userEvent.click(await screen.findByText(/repeat weekly/i));
    const mondayCheckbox = screen.getByLabelText("MO");
    userEvent.click(mondayCheckbox);

    const radio = screen.getByLabelText(/after/i);
    userEvent.click(radio);
    const input = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(input, { target: { value: "3" } });
    const spyAPi = jest.spyOn(apiUtils, "api");

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(spyAPi).toHaveBeenCalled();
    });

    const receivedPayload = spyAPi.mock.calls[0][1]?.body;
    expect(receivedPayload).toEqual(
      JSON.stringify([
        "vcalendar",
        [],
        [
          [
            "vevent",
            [
              ["uid", {}, "text", "bfe2c579-acce-456b-8b91-c557bb3b4f89"],
              ["transp", {}, "text", "OPAQUE"],
              ["dtstart", { tzid: "Europe/Paris" }, "date", "2025-07-18"],
              ["class", {}, "text", "PUBLIC"],
              ["x-openpaas-videoconference", {}, "unknown", null],
              ["summary", {}, "text", "Meeting"],
              ["dtend", { tzid: "Europe/Paris" }, "date", "2025-07-19"],
              [
                "organizer",
                { cn: "test" },
                "cal-address",
                "mailto:test@test.com",
              ],
              [
                "rrule",
                {},
                "recur",
                { freq: "weekly", count: 3, byday: ["MO"] },
              ],
              [
                "attendee",
                {
                  partstat: "ACCEPTED",
                  rsvp: "FALSE",
                  role: "CHAIR",
                  cutype: "INDIVIDUAL",
                  cn: "test",
                },
                "cal-address",
                "mailto:test@test.com",
              ],
            ],
            [],
          ],
          [
            "vtimezone",
            [["tzid", {}, "text", "Europe/Paris"]],
            [
              [
                "daylight",
                [
                  ["tzoffsetfrom", {}, "utc-offset", "+01:00"],
                  ["tzoffsetto", {}, "utc-offset", "+02:00"],
                  ["tzname", {}, "text", "CEST"],
                  ["dtstart", {}, "date-time", "1970-03-29T02:00:00"],
                  [
                    "rrule",
                    {},
                    "recur",
                    { freq: "YEARLY", bymonth: 3, byday: "-1SU" },
                  ],
                ],
                [],
              ],
              [
                "standard",
                [
                  ["tzoffsetfrom", {}, "utc-offset", "+02:00"],
                  ["tzoffsetto", {}, "utc-offset", "+01:00"],
                  ["tzname", {}, "text", "CET"],
                  ["dtstart", {}, "date-time", "1970-10-25T03:00:00"],
                  [
                    "rrule",
                    {},
                    "recur",
                    { freq: "YEARLY", bymonth: 10, byday: "-1SU" },
                  ],
                ],
                [],
              ],
            ],
          ],
        ],
      ])
    );

    // onClose should be called
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});
