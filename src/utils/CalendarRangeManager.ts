import { getCalendarRange } from "./dateUtils";

class CalendarRangeManager {
  private static instance: CalendarRangeManager;
  private displayedDate: Date = new Date();
  private displayedCalendarRange: { start: Date; end: Date } = getCalendarRange(
    new Date()
  );

  private constructor() {}

  public static getInstance(): CalendarRangeManager {
    if (!CalendarRangeManager.instance) {
      CalendarRangeManager.instance = new CalendarRangeManager();
    }
    return CalendarRangeManager.instance;
  }

  public getDate(): Date {
    return new Date(this.displayedDate);
  }

  public setDate(date: Date) {
    this.displayedDate = new Date(date);
    this.displayedCalendarRange = getCalendarRange(new Date(date));
  }

  public getRange(): { start: Date; end: Date } {
    return {
      start: this.displayedCalendarRange.start,
      end: this.displayedCalendarRange.end,
    };
  }
}

export const calendarRangeManager = CalendarRangeManager.getInstance();

export const getDisplayedDate = (): Date => calendarRangeManager.getDate();

export const setDisplayedDateAndRange = (date: Date) =>
  calendarRangeManager.setDate(date);

export const getDisplayedCalendarRange = (): { start: Date; end: Date } =>
  calendarRangeManager.getRange();
