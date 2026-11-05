export function formatDate(
  date: Date | string,
  t: (k: string, p?: Record<string, unknown>) => string,
  timeZone: string,
  allday?: boolean
): string {
  // A start the client cannot read (a second 60...) gives no text, as in
  // formatEnd, instead of "Invalid Date"
  if (isNaN(new Date(date).getTime())) {
    return ''
  }
  if (allday) {
    // All-day dates are floating YYYY-MM-DD values parsed as UTC midnight
    return new Date(date).toLocaleDateString(t('locale'), {
      year: 'numeric',
      month: 'long',
      weekday: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    })
  } else {
    return new Date(date).toLocaleString(t('locale'), {
      year: 'numeric',
      month: 'long',
      weekday: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone
    })
  }
}
