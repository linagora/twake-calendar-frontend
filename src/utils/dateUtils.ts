export function formatDateToYYYYMMDDTHHMMSS(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}T000000`;
}

export function getCalendarRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeekStart = firstOfMonth.getDay();
  const diffToMonday = (dayOfWeekStart + 6) % 7;
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - diffToMonday);

  const lastOfMonth = new Date(year, month + 1, 0);
  const dayOfWeekEnd = lastOfMonth.getDay();

  const diffToSunday = (7 - dayOfWeekEnd) % 7;
  const endDate = new Date(lastOfMonth);
  endDate.setDate(lastOfMonth.getDate() + diffToSunday);

  return {
    start: startDate,
    end: endDate,
  };
}

export function getDeltaInMilliseconds(delta: {
  years: number;
  months: number;
  days: number;
  milliseconds: number;
}) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const AVG_MS_PER_MONTH = 30.44 * MS_PER_DAY; // approx
  const AVG_MS_PER_YEAR = 365.25 * MS_PER_DAY; // approx

  return (
    (delta.years || 0) * AVG_MS_PER_YEAR +
    (delta.months || 0) * AVG_MS_PER_MONTH +
    (delta.days || 0) * MS_PER_DAY +
    (delta.milliseconds || 0)
  );
}

export const computeStartOfTheWeek = (date: Date): Date => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - ((date.getDay() + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};
