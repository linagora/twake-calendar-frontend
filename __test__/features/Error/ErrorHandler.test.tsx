import { EventErrorHandler } from "@/components/Error/EventErrorHandler";

describe("EventErrorHandler", () => {
  it("calls the callback when a new error is reported", () => {
    const handler = new EventErrorHandler();
    const callback = jest.fn();

    handler.setErrorCallback(callback);
    handler.reportError("123", "Something broke");

    expect(callback).toHaveBeenCalledWith(["Something broke"]);
  });

  it("does not duplicate errors for same eventId", () => {
    const handler = new EventErrorHandler();
    const callback = jest.fn();

    handler.setErrorCallback(callback);
    handler.reportError("A", "Error 1");
    handler.reportError("A", "Error 1 again");

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("clears errors properly", () => {
    const handler = new EventErrorHandler();
    const callback = jest.fn();

    handler.setErrorCallback(callback);
    handler.reportError("A", "Error 1");
    handler.clearAll();

    expect(callback).toHaveBeenLastCalledWith([]);
  });
});
