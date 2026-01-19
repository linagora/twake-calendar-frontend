import { getCalendarRange } from "@/utils/dateUtils";

describe("getCalendarRange", () => {
  it("Nov 2025 (5 weeks): 2025-10-27 to 2025-11-30", () => {
    const { start, end } = getCalendarRange(
      new Date("2025-11-01T00:00:00.000Z")
    );
    expect(start.toISOString().slice(0, 10)).toBe("2025-10-27");
    expect(end.toISOString().slice(0, 10)).toBe("2025-11-30");
  });

  it("Dec 2025 (6 weeks): end Sunday 2026-01-04", () => {
    const { start, end } = getCalendarRange(
      new Date("2025-12-01T00:00:00.000Z")
    );
    expect(start.toISOString().slice(0, 10)).toBe("2025-12-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-04");
  });

  it("Feb 2025 (short month): end Sunday 2025-03-02", () => {
    const { start, end } = getCalendarRange(
      new Date("2025-02-01T00:00:00.000Z")
    );
    expect(start.toISOString().slice(0, 10)).toBe("2025-01-27");
    expect(end.toISOString().slice(0, 10)).toBe("2025-03-02");
  });

  it("sets boundary times correctly (start 00:00, end 23:59)", () => {
    const { start, end } = getCalendarRange(
      new Date("2025-11-01T00:00:00.000Z")
    );
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});
