export function formatDate(
  date: Date | string,
  t: (k: string, p?: Record<string, unknown>) => string,
  timeZone: string,
  allday?: boolean
): string {
  if (allday) {
    return new Date(date).toLocaleDateString(t('locale'), {
      year: 'numeric',
      month: 'long',
      weekday: 'long',
      day: 'numeric',
      timeZone
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
