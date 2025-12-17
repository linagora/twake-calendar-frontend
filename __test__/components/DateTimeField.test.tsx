import {
  screen,
  fireEvent,
  waitFor,
  act,
  render,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DateTimeFieldsProps,
  DateTimeFields,
} from "../../src/components/Event/components/DateTimeFields";

jest.mock("twake-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: "en",
  }),
}));

describe("DateTimeFields", () => {
  const mockHandlers = {
    onStartDateChange: jest.fn(),
    onStartTimeChange: jest.fn(),
    onEndDateChange: jest.fn(),
    onEndTimeChange: jest.fn(),
    onToggleEndDate: jest.fn(),
  };

  const defaultProps: DateTimeFieldsProps = {
    startDate: "2025-07-18",
    startTime: "09:00",
    endDate: "2025-07-18",
    endTime: "10:00",
    allday: false,
    showMore: true,
    hasEndDateChanged: false,
    showEndDate: false,
    validation: {
      errors: {
        dateTime: "",
      },
    },
    ...mockHandlers,
  };

  const renderField = async (props: Partial<DateTimeFieldsProps> = {}) => {
    await act(async () =>
      render(<DateTimeFields {...defaultProps} {...props} />)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("moves END forward when START moves after END (normal mode)", async () => {
    await renderField({
      startDate: "2025-01-01",
      startTime: "10:00",
      endDate: "2025-01-01",
      endTime: "11:00",
      showMore: true,
    });

    const startTimeInput = screen.getByTestId("start-time-input");

    fireEvent.change(startTimeInput, { target: { value: "12:00" } });
    fireEvent.blur(startTimeInput);

    await waitFor(() =>
      expect(mockHandlers.onStartTimeChange).toHaveBeenCalledWith("12:00")
    );
    await waitFor(() =>
      expect(mockHandlers.onEndTimeChange).toHaveBeenCalledWith("13:00")
    );
  });

  it("moves END forward by full duration when START date jumps after END date", async () => {
    await renderField({
      startDate: "2025-01-01",
      startTime: "09:00",
      endDate: "2025-01-01",
      endTime: "10:00",
      showMore: true,
    });

    await userEvent.click(screen.getByTestId("start-date-input"));
    const dayButton = screen.getByRole("gridcell", { name: "3" });
    await userEvent.click(dayButton);

    await waitFor(() =>
      expect(mockHandlers.onStartDateChange).toHaveBeenCalledWith("2025-01-03")
    );

    await waitFor(() =>
      expect(mockHandlers.onEndDateChange).toHaveBeenCalledWith("2025-01-03")
    );
  });

  it("does NOT move START backward when END moves before START (normal mode)", async () => {
    await renderField({
      startDate: "2025-01-01",
      startTime: "10:00",
      endDate: "2025-01-01",
      endTime: "11:00",
      showMore: true,
    });

    const endTimeInput = screen.getByTestId("end-time-input");

    fireEvent.change(endTimeInput, { target: { value: "08:00" } });
    fireEvent.blur(endTimeInput);

    await waitFor(() =>
      expect(mockHandlers.onEndTimeChange).toHaveBeenCalledWith("08:00")
    );

    // Start time should NOT be automatically adjusted when end time changes
    expect(mockHandlers.onStartTimeChange).not.toHaveBeenCalled();
    expect(mockHandlers.onStartDateChange).not.toHaveBeenCalled();
  });

  it("moves START backward properly when END date jumps before START date", async () => {
    await renderField({
      startDate: "2025-01-05",
      startTime: "09:00",
      endDate: "2025-01-05",
      endTime: "10:00",
      showMore: true,
    });

    await userEvent.click(screen.getByTestId("end-date-input"));
    const dayButton = screen.getByRole("gridcell", { name: "3" });
    await userEvent.click(dayButton);

    await waitFor(() =>
      expect(mockHandlers.onEndDateChange).toHaveBeenCalledWith("2025-01-03")
    );

    await waitFor(() =>
      expect(mockHandlers.onStartDateChange).toHaveBeenCalledWith("2025-01-03")
    );
  });

  it("pushes END forward in whole days for allday events", async () => {
    await renderField({
      allday: true,
      startDate: "2025-02-01",
      endDate: "2025-02-03",
      showEndDate: true,
    });

    await userEvent.click(screen.getByTestId("start-date-input"));
    const dayButton = screen.getByRole("gridcell", { name: "10" });
    await userEvent.click(dayButton);

    await waitFor(() =>
      expect(mockHandlers.onStartDateChange).toHaveBeenCalledWith("2025-02-10")
    );

    await waitFor(() =>
      expect(mockHandlers.onEndDateChange).toHaveBeenCalledWith("2025-02-12")
    );
  });

  it("moves START backward in whole days for allday when END moves earlier", async () => {
    await renderField({
      allday: true,
      startDate: "2025-05-10",
      endDate: "2025-05-15",
      showEndDate: true,
    });

    await userEvent.click(screen.getByTestId("end-date-input"));
    const dayButton = screen.getByRole("gridcell", { name: "1" });
    await userEvent.click(dayButton);

    await waitFor(() =>
      expect(mockHandlers.onEndDateChange).toHaveBeenCalledWith("2025-05-01")
    );

    await waitFor(() =>
      expect(mockHandlers.onStartDateChange).toHaveBeenCalledWith("2025-04-26")
    );
  });

  it("does not call handlers if invalid (null) date value", async () => {
    await renderField({
      showMore: true,
    });

    const startDateInput = screen.getByTestId("start-date-input");

    fireEvent.change(startDateInput, { target: { value: "" } });

    expect(mockHandlers.onStartDateChange).not.toHaveBeenCalled();
    expect(mockHandlers.onEndDateChange).not.toHaveBeenCalled();
  });

  it("shift to preserve original duration (normal case)", async () => {
    await renderField({
      startDate: "2025-01-01",
      startTime: "09:00",
      endDate: "2025-01-01",
      endTime: "10:00",
      showMore: true,
    });

    const startTimeInput = screen.getByTestId("start-time-input");

    fireEvent.change(startTimeInput, { target: { value: "09:30" } });
    fireEvent.blur(startTimeInput);

    await waitFor(() =>
      expect(mockHandlers.onStartTimeChange).toHaveBeenCalledWith("09:30")
    );
    await waitFor(() =>
      expect(mockHandlers.onEndTimeChange).toHaveBeenCalledWith("10:30")
    );
  });

  it("preserves 1-hour duration across midnight when changing start time from 22:30 to 23:45", async () => {
    await renderField({
      startDate: "2025-01-15",
      startTime: "22:30",
      endDate: "2025-01-15",
      endTime: "23:30",
      showMore: true,
    });

    const startTimeInput = screen.getByTestId("start-time-input");

    // Change start time from 22:30 to 23:45
    fireEvent.change(startTimeInput, { target: { value: "23:45" } });
    fireEvent.blur(startTimeInput);

    await waitFor(() =>
      expect(mockHandlers.onStartTimeChange).toHaveBeenCalledWith("23:45")
    );

    // End date should move to the next day
    await waitFor(() =>
      expect(mockHandlers.onEndDateChange).toHaveBeenCalledWith(
        "2025-01-16",
        "00:45"
      )
    );
  });

  it("should have aria-label for accessibility and testing", async () => {
    await renderField({
      startDate: "2025-01-01",
      startTime: "10:00",
      endDate: "2025-01-01",
      endTime: "11:00",
      showMore: true,
    });

    const startDateInput = screen.getByTestId("start-date-input");
    const startTimeInput = screen.getByTestId("start-time-input");
    const endDateInput = screen.getByTestId("end-date-input");
    const endTimeInput = screen.getByTestId("end-time-input");

    expect(startDateInput).toHaveAttribute(
      "aria-label",
      "dateTimeFields.startDate"
    );
    expect(startTimeInput).toHaveAttribute(
      "aria-label",
      "dateTimeFields.startTime"
    );
    expect(endDateInput).toHaveAttribute(
      "aria-label",
      "dateTimeFields.endDate"
    );
    expect(endTimeInput).toHaveAttribute(
      "aria-label",
      "dateTimeFields.endTime"
    );
  });

  describe("DateTimeFields - Drag and Drop Display Logic", () => {
    // Test 1.1: Display 2 fields when drag from allday slot (multiple days)
    it("displays only 2 date fields when allday=true and multiple days", async () => {
      await renderField({
        allday: true,
        hasEndDateChanged: false,
        startDate: "2025-07-18",
        endDate: "2025-07-20",
        showEndDate: true,
        showMore: false,
      });

      expect(screen.getByTestId("start-date-input")).toBeInTheDocument();
      expect(screen.getByTestId("end-date-input")).toBeInTheDocument();
      expect(screen.queryByTestId("start-time-input")).not.toBeInTheDocument();
      expect(screen.queryByTestId("end-time-input")).not.toBeInTheDocument();
    });

    // Test 1.2: Display 4 fields when drag from week view (multiple days)
    it("displays 4 fields when allday=false, hasEndDateChanged=true, and multiple days", async () => {
      await renderField({
        allday: false,
        hasEndDateChanged: true,
        startDate: "2025-07-18",
        endDate: "2025-07-20",
        startTime: "09:00",
        endTime: "10:00",
        showEndDate: true,
        showMore: false,
      });

      expect(screen.getByTestId("start-date-input")).toBeInTheDocument();
      expect(screen.getByTestId("start-time-input")).toBeInTheDocument();
      expect(screen.getByTestId("end-date-input")).toBeInTheDocument();
      expect(screen.getByTestId("end-time-input")).toBeInTheDocument();
    });

    // Test 1.3: Display single date + time fields
    it("displays single date field with time fields for single day event", async () => {
      await renderField({
        allday: false,
        hasEndDateChanged: false,
        startDate: "2025-07-18",
        endDate: "2025-07-18",
        startTime: "09:00",
        endTime: "10:00",
        showEndDate: false,
        showMore: false,
      });

      const startDateInput = screen.getByTestId("start-date-input");
      expect(startDateInput).toHaveAttribute(
        "aria-label",
        "dateTimeFields.date"
      );
      expect(screen.getByTestId("start-time-input")).toBeInTheDocument();
      expect(screen.getByTestId("end-time-input")).toBeInTheDocument();
      expect(screen.queryByTestId("end-date-input")).not.toBeInTheDocument();
    });
  });
});
