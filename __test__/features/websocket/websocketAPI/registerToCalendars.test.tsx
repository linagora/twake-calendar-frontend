import { registerToCalendars } from "@/websocket/operations/registerToCalendars";

describe("registerToCalendars", () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    };
  });

  it("should send registration message with calendar URIs", () => {
    const calendarURIs = ["/calendars/cal1", "/calendars/cal2"];

    registerToCalendars(mockSocket, calendarURIs);

    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        register: calendarURIs,
      })
    );
  });

  it("should throw error if socket is not open", () => {
    mockSocket.readyState = WebSocket.CONNECTING;
    const calendarURIs = ["/calendars/cal1"];

    expect(() => registerToCalendars(mockSocket, calendarURIs)).toThrow(
      "Cannot register: WebSocket is not open"
    );
  });

  it("should handle empty calendar list", () => {
    registerToCalendars(mockSocket, []);

    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        register: [],
      })
    );
  });

  it("should log registration", () => {
    const consoleLogSpy = jest.spyOn(console, "info").mockImplementation();
    const calendarURIs = ["/calendars/cal1", "/calendars/cal2"];

    registerToCalendars(mockSocket, calendarURIs);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Registered to calendars",
      calendarURIs
    );

    consoleLogSpy.mockRestore();
  });
});
