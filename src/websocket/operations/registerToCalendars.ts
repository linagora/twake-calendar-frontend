export function registerToCalendars(
  socket: WebSocket,
  calendarURIList: string[]
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error("Cannot register: WebSocket is not open");
  }

  socket.send(
    JSON.stringify({
      register: calendarURIList,
    })
  );

  console.log("Registered to calendars", calendarURIList);
}
