// src/websocket/__tests__/unregisterToCalendars.test.ts

import { unregisterToCalendars } from "../../../../src/websocket/ws/unregisterToCalendars";

describe("unregisterToCalendars", () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should send unregistration message with calendar URIs", () => {
    const calendarURIs = ["/calendars/cal1", "/calendars/cal2"];

    unregisterToCalendars(mockSocket, calendarURIs);

    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        unregister: calendarURIs,
      })
    );
  });

  it("should throw error if socket is not open", () => {
    mockSocket.readyState = WebSocket.CONNECTING;
    const calendarURIs = ["/calendars/cal1"];

    expect(() => unregisterToCalendars(mockSocket, calendarURIs)).toThrow(
      "Cannot unregister: WebSocket is not open"
    );
  });

  it("should handle empty calendar list", () => {
    unregisterToCalendars(mockSocket, []);

    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        unregister: [],
      })
    );
  });

  it("should log unregistration", () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    const calendarURIs = ["/calendars/cal1", "/calendars/cal2"];

    unregisterToCalendars(mockSocket, calendarURIs);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Unregistered to calendars",
      calendarURIs
    );

    consoleLogSpy.mockRestore();
  });
});
