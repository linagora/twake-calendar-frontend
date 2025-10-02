import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/Renderwithproviders";
import RepeatEvent from "../../src/components/Event/EventRepeat";
import EventPopover from "../../src/features/Events/EventModal";
import { RepetitionObject } from "../../src/features/Events/EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";
import { formatDateToYYYYMMDDTHHMMSS } from "../../src/utils/dateUtils";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import * as apiUtils from "../../src/utils/apiUtils";

const baseRepetition: RepetitionObject = {
  freq: "",
  interval: 1,
  occurrences: 0,
  endDate: "",
  selectedDays: [],
};

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

function setupRepeatEvent(props?: Partial<RepetitionObject>, state?: any) {
  const setRepetition = jest.fn();
  renderWithProviders(
    <RepeatEvent
      repetition={{ ...baseRepetition, ...props }}
      eventStart={defaultSelectedRange.start}
      setRepetition={setRepetition}
      isOwn={true}
    />,
    state
  );
  return { setRepetition };
}

async function setupEventPopover(
  overrides?: Partial<{ start: string; end: string }>
) {
  jest
    .spyOn(crypto, "randomUUID")
    .mockReturnValue("fixed-uuid-with-correct-format");
  const originalDateResolvedOptions =
    new Intl.DateTimeFormat().resolvedOptions();
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...originalDateResolvedOptions,
    timeZone: "UTC",
  });

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
  act(() => {
    fireEvent.change(screen.getByRole("textbox", { name: /title/i }), {
      target: { value: "Meeting" },
    });
    fireEvent.click(screen.getByLabelText("All day"));
    fireEvent.change(screen.getByLabelText("Start"), {
      target: {
        value: (overrides?.start ?? "2025-07-18T00:00:00.000Z").split("T")[0],
      },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: {
        value: (overrides?.end ?? "2025-07-19T00:00:00.000Z").split("T")[0],
      },
    });
    const showMoreButton = screen.queryByText("Show More");
    if (showMoreButton) {
      fireEvent.click(showMoreButton);
    }
  });
  const select = screen.getByLabelText(/repeat/i);
  userEvent.click(select);

  return jest.spyOn(apiUtils, "api");
}

async function expectRRule(expected: any) {
  const spyAPi = jest.spyOn(apiUtils, "api");

  const saveButton = screen.getByRole("button", { name: /save/i });
  act(() => fireEvent.click(saveButton));

  await waitFor(() => {
    expect(spyAPi).toHaveBeenCalled();
  });

  const receivedPayload: string =
    spyAPi.mock.calls[0][1]?.body?.toString() ?? "";
  const [, , [vevent]] = JSON.parse(receivedPayload);
  const rrule = vevent[1].find(([name]: any) => name === "rrule");

  if (rrule[3].byday) {
    expect({
      ...rrule[3],
      byday: rrule[3].byday.sort(),
    }).toEqual({
      ...expected,
      byday: expected.byday.sort(),
    });
  } else {
    expect(rrule[3]).toEqual(expected);
  }
}

describe("RepeatEvent", () => {
  it("renders with no repetition by default", () => {
    setupRepeatEvent();
    expect(screen.getByText(/Repeat every/i)).toBeInTheDocument();
    // Check that the select exists and has default value
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("allows selecting repetition frequency", async () => {
    const { setRepetition } = setupRepeatEvent();
    const select = screen.getByRole("combobox");
    act(() => {
      userEvent.click(select);
    });
    await waitFor(async () =>
      userEvent.click(await screen.findByText(/repeat weekly/i))
    );

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ freq: "weekly" })
    );
  });

  it("renders interval input when frequency is selected", () => {
    setupRepeatEvent({ freq: "daily", interval: 2 });
    expect(screen.getByText(/Repeat every/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  it("updates interval value", () => {
    const { setRepetition } = setupRepeatEvent({ freq: "daily", interval: 1 });
    const input = screen.getByDisplayValue("1");
    fireEvent.change(input, { target: { value: "5" } });
    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 5 })
    );
  });

  it("toggles day selection for weekly frequency", () => {
    const { setRepetition } = setupRepeatEvent({
      freq: "weekly",
      selectedDays: [],
    });
    act(() => {
      const mondayCheckbox = screen.getByLabelText("MO");
      fireEvent.click(mondayCheckbox);
    });
    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDays: ["MO"] })
    );
  });
});

describe("Repeat Event API calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("sends correct CalendarEvent payload", async () => {
    setupEventPopover();

    userEvent.click(await screen.findByText(/repeat weekly/i));

    const spy = jest
      .spyOn(eventThunks, "putEventAsync")
      .mockImplementation((payload) => () => Promise.resolve(payload) as any);
    const saveButton = screen.getByRole("button", { name: /save/i });
    act(() => fireEvent.click(saveButton));
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const received = spy.mock.calls[0][0];
    expect(received.cal).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"]
    );
    expect(received.newEvent.title).toBe("Meeting");
    expect(
      formatDateToYYYYMMDDTHHMMSS(new Date(received.newEvent.start)).split(
        "T"
      )[0]
    ).toBe("20250718");
    expect(
      formatDateToYYYYMMDDTHHMMSS(
        new Date(received.newEvent.end || new Date())
      ).split("T")[0]
    ).toBe("20250719");
    expect(received.newEvent.organizer).toEqual(
      preloadedState.user.organiserData
    );
    const day = new Date(received.newEvent.start)
      .toLocaleString("en-UK", {
        weekday: "short",
      })
      .slice(0, 2)
      .toUpperCase();

    expect(received.newEvent.repetition).toEqual({
      freq: "weekly",
      selectedDays: [day],
    });
    expect(received.newEvent.color).toEqual(
      preloadedState.calendars.list["667037022b752d0026472254/cal1"].color
    );
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat daily", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat daily/i));

    await expectRRule({ freq: "daily" });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat daily with 2 day interval", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat daily/i));
    const intervalInput = screen.getByDisplayValue("1");
    fireEvent.change(intervalInput, { target: { value: "2" } });

    await expectRRule({ freq: "daily", interval: 2 });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat daily for 5 repetitions", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat daily/i));
    userEvent.click(screen.getByLabelText(/after/i));
    const input = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(input, { target: { value: "5" } });

    await expectRRule({ freq: "daily", count: 5 });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat daily until now+5days", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat daily/i));
    userEvent.click(screen.getAllByLabelText(/on/i)[3]);

    const untilInput = screen.getByTestId("end-date");
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    fireEvent.change(untilInput, {
      target: { value: futureDate.toISOString().split("T")[0] },
    });
    await expectRRule({
      freq: "daily",
      until: futureDate.toISOString().split("T")[0],
    });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat weekly on Thursday and event day (Friday)", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat weekly/i));
    userEvent.click(screen.getByLabelText("TH"));

    await expectRRule({ freq: "weekly", byday: ["TH", "FR"] });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("sends correct API payload for repeat weekly on Thursday and event day (Friday) and an interval of 3 weeks", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat weekly/i));

    userEvent.click(screen.getByLabelText("TH"));

    const intervalInput = screen.getByDisplayValue("1");
    fireEvent.change(intervalInput, { target: { value: "3" } });

    await expectRRule({ freq: "weekly", byday: ["TH", "FR"], interval: 3 });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("sends correct API payload for repeat monthly", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat monthly/i));

    await expectRRule({ freq: "monthly" });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("sends correct API payload for repeat monthly and end after 5 occurrences", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat monthly/i));
    userEvent.click(screen.getByLabelText(/after/i));
    const input = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(input, { target: { value: "5" } });
    await expectRRule({ freq: "monthly", count: 5 });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
  it("sends correct API payload for repeat yearly", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat yearly/i));

    await expectRRule({ freq: "yearly" });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("sends correct API payload for repeat yearly, but user first choose to end after 5 occurrences then changed mind and chose to not end", async () => {
    await setupEventPopover();

    userEvent.click(await screen.findByText(/repeat yearly/i));
    userEvent.click(screen.getByLabelText(/after/i));
    const input = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(input, { target: { value: "5" } });
    userEvent.click(screen.getByLabelText(/never/i));

    await expectRRule({ freq: "yearly" });
    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});
