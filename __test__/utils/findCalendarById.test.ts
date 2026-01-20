import { RootState } from "@/app/store";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { findCalendarById } from "@/utils";

describe("findCalendarById", () => {
  const mockCalendar1: Calendar = {
    id: "cal1",
    name: "Personal",
    color: { light: "#FF0000" },
  } as unknown as Calendar;

  const mockCalendar2: Calendar = {
    id: "cal2",
    name: "Work",
    color: { light: "#0000FF" },
  } as unknown as Calendar;

  const mockTempCalendar: Calendar = {
    id: "temp1",
    name: "Temporary",
    color: { light: "#00FF00" },
  } as unknown as Calendar;

  const mockState = {
    calendars: {
      list: {
        cal1: mockCalendar1,
        cal2: mockCalendar2,
      },
      templist: {
        temp1: mockTempCalendar,
      },
    },
  } as unknown as Partial<RootState>;

  it("should find calendar in main list", () => {
    const result = findCalendarById(mockState, "cal1");

    expect(result?.calendar).toEqual(mockCalendar1);
    expect(result?.type).toBeUndefined();
  });

  it("should find calendar in temp list", () => {
    const result = findCalendarById(mockState, "temp1");

    expect(result?.calendar).toEqual(mockTempCalendar);
    expect(result?.type).toBe("temp");
  });

  it("should not return calendar for non-existent id", () => {
    const result = findCalendarById(mockState, "nonexistent");

    expect(result).toBeUndefined();
  });

  it("should not return calendar for empty string", () => {
    const result = findCalendarById(mockState, "");

    expect(result).toBeUndefined();
  });

  it("should prioritize main list over temp list", () => {
    const stateWithDuplicate = {
      calendars: {
        list: {
          dup1: mockCalendar1,
        },
        templist: {
          dup1: mockTempCalendar,
        },
      },
    } as unknown as Partial<RootState>;

    const result = findCalendarById(stateWithDuplicate, "dup1");

    expect(result?.calendar).toEqual(mockCalendar1);
    expect(result?.type).toBeUndefined();
  });

  it("should handle undefined list or templist", () => {
    const stateWithPartialCalendars = {
      calendars: {
        list: undefined,
        templist: { temp1: mockTempCalendar },
      },
    } as unknown as Partial<RootState>;

    const result = findCalendarById(stateWithPartialCalendars, "temp1");
    expect(result?.calendar).toEqual(mockTempCalendar);
  });

  it("should handle missing calendars state", () => {
    const emptyState = {};

    const result = findCalendarById(emptyState, "cal1");

    expect(result).toBeUndefined();
  });
});
