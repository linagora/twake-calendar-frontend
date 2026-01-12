export function setSelectedCalendars(calendars: string[]) {
  localStorage.setItem("selectedCalendars", JSON.stringify(calendars));

  window.dispatchEvent(
    new CustomEvent("selectedCalendarsChanged", {
      detail: calendars,
    })
  );
}
