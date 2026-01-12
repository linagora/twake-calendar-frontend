export function setSelectedCalendars(calendars: string[]) {
  try {
    localStorage.setItem("selectedCalendars", JSON.stringify(calendars));

    window.dispatchEvent(
      new CustomEvent("selectedCalendarsChanged", {
        detail: calendars,
      })
    );
  } catch (error) {
    console.error("Failed to save selected calendars:", error);
  }
}
