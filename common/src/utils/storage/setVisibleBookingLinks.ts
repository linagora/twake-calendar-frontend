export function setVisibleBookingLinks(linkPublicIds: string[]) {
  try {
    localStorage.setItem('visibleBookingLinks', JSON.stringify(linkPublicIds))

    window.dispatchEvent(
      new CustomEvent('visibleBookingLinksChanged', {
        detail: linkPublicIds
      })
    )
  } catch (error) {
    console.error('Failed to save visible booking links:', error)
  }
}
