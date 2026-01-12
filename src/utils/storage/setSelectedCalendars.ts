export function setSelectedCalendars(calendars: string[]) {
  try {
    localStorage.setItem("selectedCalendars", JSON.stringify(calendars));

    window.dispatchEvent(
      new CustomEvent("selectedCalendarsChanged", {
        detail: calendars,
      })
    );
  } catch {
    console.error("localStorage error");
  }
}
