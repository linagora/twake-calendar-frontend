class CalendarDateManager {
  private static instance: CalendarDateManager;
  private displayedDate: Date = new Date();

  private constructor() {}

  public static getInstance(): CalendarDateManager {
    if (!CalendarDateManager.instance) {
      CalendarDateManager.instance = new CalendarDateManager();
    }
    return CalendarDateManager.instance;
  }

  public getDate(): Date {
    return this.displayedDate;
  }

  public setDate(date: Date) {
    this.displayedDate = date;
  }
}

export const calendarDateManager = CalendarDateManager.getInstance();

export const getDisplayedDate = (): Date => calendarDateManager.getDate();

export const setDisplayedDate = (date: Date) =>
  calendarDateManager.setDate(date);
