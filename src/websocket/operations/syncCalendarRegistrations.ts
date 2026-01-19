import { WebSocketWithCleanup } from "../connection";
import { registerToCalendars } from "./registerToCalendars";
import { unregisterToCalendars } from "./unregisterToCalendars";

export function syncCalendarRegistrations(
  isSocketOpen: boolean,
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>,
  calendarList: string[],
  previousCalendarListRef: React.MutableRefObject<string[]>
) {
  if (
    !isSocketOpen ||
    !socketRef.current ||
    socketRef.current.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  const currentPaths = calendarList.map((cal) => `/calendars/${cal}`);
  const previousPaths = previousCalendarListRef.current.map(
    (cal) => `/calendars/${cal}`
  );

  const toRegister = currentPaths.filter(
    (path) => !previousPaths.includes(path)
  );
  const toUnregister = previousPaths.filter(
    (path) => !currentPaths.includes(path)
  );

  try {
    if (toRegister.length > 0) {
      registerToCalendars(socketRef.current, toRegister);
    }
  } catch (error) {
    console.error("Failed to register calendar:", error);
    return;
  }
  try {
    if (toUnregister.length > 0) {
      unregisterToCalendars(socketRef.current, toUnregister);
    }
  } catch (error) {
    console.error("Failed to unregister calendar:", error);
    return;
  }
  previousCalendarListRef.current = calendarList;
}
