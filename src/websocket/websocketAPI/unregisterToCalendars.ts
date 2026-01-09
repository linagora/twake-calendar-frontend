export function unregisterToCalendars(
  socket: WebSocket,
  calendarURIList: string[]
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error("Cannot unregister: WebSocket is not open");
  }
  [];
  console.log(calendarURIList);

  socket.send(
    JSON.stringify({
      unregister: calendarURIList,
    })
  );

  console.log("Unregistered to calendars", calendarURIList);
}
