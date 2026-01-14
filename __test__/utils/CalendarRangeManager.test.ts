import {
  getDisplayedDate,
  setDisplayedDateAndRange,
  calendarRangeManager,
} from "../../src/utils/CalendarRangeManager";

describe("CalendarRangeManager", () => {
  beforeEach(() => {
    setDisplayedDateAndRange(new Date());
  });

  it("should return a singleton instance", () => {
    const instance1 = calendarRangeManager;
    const instance2 = calendarRangeManager;

    expect(instance1).toStrictEqual(instance2);
  });

  it("should get the default date", () => {
    const date = getDisplayedDate();
    expect(date).toBeInstanceOf(Date);
  });

  it("should set and get a date", () => {
    const testDate = new Date("2025-01-15T10:00:00Z");
    setDisplayedDateAndRange(testDate);

    const retrievedDate = getDisplayedDate();
    expect(retrievedDate).toStrictEqual(testDate);
  });

  it("should persist date across multiple calls", () => {
    const testDate = new Date("2025-06-20T15:30:00Z");
    setDisplayedDateAndRange(testDate);

    const date1 = getDisplayedDate();
    const date2 = getDisplayedDate();

    expect(date1).toStrictEqual(date2);
    expect(date1).toStrictEqual(testDate);
  });

  it("should update date when set multiple times", () => {
    const date1 = new Date("2025-01-01T00:00:00Z");
    const date2 = new Date("2025-12-31T23:59:59Z");

    setDisplayedDateAndRange(date1);
    expect(getDisplayedDate()).toStrictEqual(date1);

    setDisplayedDateAndRange(date2);
    expect(getDisplayedDate()).toStrictEqual(date2);
  });

  it("should maintain shared state (singleton behavior)", () => {
    const testDate = new Date("2025-03-01");
    setDisplayedDateAndRange(testDate);

    // Verify CalendarRangeManager reflects the same state
    expect(calendarRangeManager.getDate()).toStrictEqual(testDate);
  });
});
