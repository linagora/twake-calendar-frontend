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
    return new Date(this.displayedDate);
  }

  public setDate(date: Date) {
    this.displayedDate = new Date(date);
  }
}

export const calendarDateManager = CalendarDateManager.getInstance();

export const getDisplayedDate = (): Date => calendarDateManager.getDate();

export const setDisplayedDate = (date: Date) =>
  calendarDateManager.setDate(date);
