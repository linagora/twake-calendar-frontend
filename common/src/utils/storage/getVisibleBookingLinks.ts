export function getVisibleBookingLinks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('visibleBookingLinks') ?? '[]')
  } catch {
    return []
  }
}
