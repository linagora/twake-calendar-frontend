import { WS_INBOUND_EVENTS } from "@/websocket/protocols";
import { parseMessage } from "@/websocket/messaging/parseMessage";

describe("parseMessage", () => {
  it("should return empty set for non-object messages", () => {
    const result1 = parseMessage(null);
    const result2 = parseMessage("string");
    const result3 = parseMessage(123);

    expect(result1).toEqual(new Set<string>());
    expect(result2).toEqual(new Set<string>());
    expect(result3).toEqual(new Set<string>());
  });

  it("should handle registered event", () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: [
        "/calendars/cal1/entry1",
        "/calendars/cal2/entry2",
      ],
    };

    const result = parseMessage(message);

    expect(result).toContain("/calendars/cal1/entry1");
    expect(result).toContain("/calendars/cal2/entry2");
    expect(result.size).toBe(2);
  });

  it("should handle unregistered event", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: ["/calendars/cal1/entry1"],
    };

    parseMessage(message);

    expect(consoleSpy).toHaveBeenCalledWith("Unregistered Calendar", [
      "/calendars/cal1/entry1",
    ]);

    consoleSpy.mockRestore();
  });

  it("should handle calendar path updates", () => {
    const message = {
      "/calendars/cal1/entry1": { updated: true },
    };

    const result = parseMessage(message);

    expect(result).toContain("/calendars/cal1/entry1");
    expect(result.size).toBe(1);
  });

  it("should parse multiple calendar paths", () => {
    const message = {
      "/calendars/cal1/entry1": {},
      "/calendars/cal2/entry2": {},
    };

    const result = parseMessage(message);

    expect(result.size).toBe(2);
    expect(result).toContain("/calendars/cal1/entry1");
    expect(result).toContain("/calendars/cal2/entry2");
  });

  it("should handle multiple event types in single message", () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: ["/calendars/cal1/entry1"],
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: ["/calendars/cal2/entry2"],
      "/calendars/cal1/entry1": {},
    };

    const result = parseMessage(message);

    expect(result.size).toBe(1);
    expect(result).toContain("/calendars/cal1/entry1");
  });
});
