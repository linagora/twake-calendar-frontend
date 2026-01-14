import {
  getDisplayedDate,
  setDisplayedDate,
  calendarDateManager,
} from "../../src/utils/calendarDateManager";

describe("calendarDateManager", () => {
  beforeEach(() => {
    setDisplayedDate(new Date());
  });

  it("should return a singleton instance", () => {
    const instance1 = calendarDateManager;
    const instance2 = calendarDateManager;

    expect(instance1).toBe(instance2);
  });

  it("should get the default date", () => {
    const date = getDisplayedDate();
    expect(date).toBeInstanceOf(Date);
  });

  it("should set and get a date", () => {
    const testDate = new Date("2025-01-15T10:00:00Z");
    setDisplayedDate(testDate);

    const retrievedDate = getDisplayedDate();
    expect(retrievedDate).toBe(testDate);
  });

  it("should persist date across multiple calls", () => {
    const testDate = new Date("2025-06-20T15:30:00Z");
    setDisplayedDate(testDate);

    const date1 = getDisplayedDate();
    const date2 = getDisplayedDate();

    expect(date1).toBe(date2);
    expect(date1).toBe(testDate);
  });

  it("should update date when set multiple times", () => {
    const date1 = new Date("2025-01-01T00:00:00Z");
    const date2 = new Date("2025-12-31T23:59:59Z");

    setDisplayedDate(date1);
    expect(getDisplayedDate()).toBe(date1);

    setDisplayedDate(date2);
    expect(getDisplayedDate()).toBe(date2);
  });
});
