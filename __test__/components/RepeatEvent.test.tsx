import * as eventThunks from "@/features/Calendars/services";
import EventPopover from "@/features/Events/EventModal";
import { RepetitionObject } from "@/features/Events/EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import RepeatEvent from "@/components/Event/EventRepeat";
import { renderWithProviders } from "../utils/Renderwithproviders";

const baseRepetition: RepetitionObject = {
  freq: "",
  interval: 1,
  occurrences: 0,
  endDate: "",
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

  // Fill in title
  const titleInput = screen.getByLabelText("event.form.title");
  fireEvent.change(titleInput, { target: { value: "Meeting" } });

  // Click More options to expand the dialog
  const showMoreButton = screen.getByRole("button", {
    name: "common.moreOptions",
  });
  fireEvent.click(showMoreButton);

  // Check Repeat checkbox to show repeat options
  const repeatCheckbox = screen.getByLabelText("event.form.repeat");
  fireEvent.click(repeatCheckbox);

  // Wait for RepeatEvent component to be rendered
  await waitFor(() => {
    expect(screen.getByText("event.repeat.frequency.days")).toBeInTheDocument();
  });
}

async function expectRRule(expected: Partial<RepetitionObject>) {
  const spy = jest
    .spyOn(eventThunks, "putEventAsync")
    .mockImplementation((payload) => {
      const promise = Promise.resolve(payload);
      (promise as any).unwrap = () => promise;
      return () => promise as any;
    });
  const saveButton = screen.getByRole("button", { name: /save/i });
  act(() => fireEvent.click(saveButton));
  await waitFor(() => expect(spy).toHaveBeenCalled());

  const received = spy.mock.calls[0][0];
  expect(received.newEvent.repetition).toMatchObject(expected);
}

describe("RepeatEvent Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("renders with no repetition by default", () => {
    const { setRepetition } = setupRepeatEvent();

    // Check that interval input shows default value
    const intervalInput = screen.getByDisplayValue("1");
    expect(intervalInput).toBeInTheDocument();

    // Check that frequency dropdown shows default value
    const frequencySelect = screen.getByRole("combobox");
    expect(frequencySelect).toBeInTheDocument();
  });

  it("allows selecting repetition frequency", () => {
    const { setRepetition } = setupRepeatEvent();

    // Click on frequency dropdown
    const frequencySelect = screen.getByRole("combobox");
    fireEvent.mouseDown(frequencySelect);

    // Select Week(s)
    const weeklyOption = screen.getByText("event.repeat.frequency.weeks");
    fireEvent.click(weeklyOption);

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ freq: "weekly" })
    );
  });

  it("renders interval input when frequency is selected", () => {
    setupRepeatEvent({ freq: "daily" });

    const intervalInput = screen.getByDisplayValue("1");
    expect(intervalInput).toBeInTheDocument();
  });

  it("updates interval value", () => {
    const { setRepetition } = setupRepeatEvent();

    const intervalInput = screen.getByDisplayValue("1");
    fireEvent.change(intervalInput, { target: { value: "3" } });

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ interval: 3 })
    );
  });

  it("toggles day selection for weekly frequency", () => {
    const { setRepetition } = setupRepeatEvent({ freq: "weekly" });

    const mondayCheckbox = screen.getByLabelText("event.repeat.days.monday");
    fireEvent.click(mondayCheckbox);

    expect(setRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ byday: ["MO"] })
    );
  });
});

describe("Repeat Event Integration Tests", () => {
  // Increase timeout for all tests in this describe block
  jest.setTimeout(30000);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("sends correct CalendarEvent payload for daily repeat", async () => {
    await setupEventPopover();

    // When Repeat checkbox is checked, repetition is set to empty object
    // We need to set the frequency manually
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const dailyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.days",
    });
    fireEvent.click(dailyOption);

    await expectRRule({ freq: "daily", interval: 1 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat daily with 2 day interval", async () => {
    await setupEventPopover();

    // Set interval to 2
    const intervalInput = screen.getByDisplayValue("1");
    fireEvent.change(intervalInput, { target: { value: "2" } });

    await expectRRule({ freq: "daily", interval: 2 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat daily for 5 repetitions", async () => {
    await setupEventPopover();

    // Select "After" end option
    const afterRadio = screen.getByLabelText(/after/i);
    fireEvent.click(afterRadio);

    // Set occurrences to 5
    const occurrencesInput = screen.getByTestId("occurrences-input");
    fireEvent.change(occurrencesInput, { target: { value: "5" } });

    await expectRRule({ freq: "daily", interval: 1, occurrences: 5 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat daily until specific date", async () => {
    await setupEventPopover();

    // Select "On" end option
    const onRadio = screen
      .getAllByLabelText(/on/i)
      .find((el) => el.type === "radio");
    fireEvent.click(onRadio!);

    // Set end date
    const endDateInput = screen.getByTestId("end-date");
    fireEvent.change(endDateInput, { target: { value: "2025-12-31" } });

    await expectRRule({ freq: "daily", interval: 1, endDate: "2025-12-31" });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat weekly on specific days", async () => {
    await setupEventPopover();

    // Select Week(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const weeklyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.weeks",
    });
    fireEvent.click(weeklyOption);

    // Select Thursday
    const thursdayCheckbox = screen.getByLabelText(
      "event.repeat.days.thursday"
    );
    fireEvent.click(thursdayCheckbox);

    await expectRRule({
      freq: "weekly",
      interval: 1,
      byday: ["FR", "TH"],
    });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat weekly with 3 week interval", async () => {
    await setupEventPopover();

    // Select Week(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const weeklyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.weeks",
    });
    fireEvent.click(weeklyOption);

    // Set interval to 3
    const intervalInput = screen.getByDisplayValue("1");
    fireEvent.change(intervalInput, { target: { value: "3" } });

    await expectRRule({ freq: "weekly", interval: 3 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat monthly", async () => {
    await setupEventPopover();

    // Select Month(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const monthlyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.months",
    });
    fireEvent.click(monthlyOption);

    await expectRRule({ freq: "monthly", interval: 1 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat monthly and end after 5 occurrences", async () => {
    await setupEventPopover();

    // Select Month(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const monthlyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.months",
    });
    fireEvent.click(monthlyOption);

    // Select "After" end option
    const afterRadio = screen.getByLabelText(/after/i);
    fireEvent.click(afterRadio);

    // Set occurrences to 5
    const occurrencesInput = screen.getByTestId("occurrences-input");
    fireEvent.change(occurrencesInput, { target: { value: "5" } });

    await expectRRule({ freq: "monthly", interval: 1, occurrences: 5 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat yearly", async () => {
    await setupEventPopover();

    // Select Year(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const yearlyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.years",
    });
    fireEvent.click(yearlyOption);

    await expectRRule({ freq: "yearly", interval: 1 });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it("sends correct API payload for repeat yearly with end option changes", async () => {
    await setupEventPopover();

    // Select Year(s) frequency
    const frequencySelect = screen.getByText("event.repeat.frequency.days");
    fireEvent.mouseDown(frequencySelect);
    const yearlyOption = screen.getByRole("option", {
      name: "event.repeat.frequency.years",
    });
    fireEvent.click(yearlyOption);

    // First choose "After" with 5 occurrences
    const afterRadio = screen.getByLabelText(/after/i);
    fireEvent.click(afterRadio);
    const occurrencesInput = screen.getByTestId("occurrences-input");
    fireEvent.change(occurrencesInput, { target: { value: "5" } });

    // Then change mind and choose "Never"
    const neverRadio = screen.getByLabelText(/never/i);
    fireEvent.click(neverRadio);

    await expectRRule({
      freq: "yearly",
      interval: 1,
      occurrences: 0,
      endDate: "",
    });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });
});
