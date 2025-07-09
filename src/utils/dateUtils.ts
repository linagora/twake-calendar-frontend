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
