import {
  detectDateTimeFormat,
  convertFormDateTimeToISO,
  DATETIME_WITH_SECONDS_LENGTH,
  DATETIME_FORMAT_WITH_SECONDS,
  DATETIME_FORMAT_WITHOUT_SECONDS,
} from "@/components/Event/utils/dateTimeHelpers";

describe("dateTimeHelpers", () => {
  describe("Constants", () => {
    it("should have correct constant values", () => {
      expect(DATETIME_WITH_SECONDS_LENGTH).toBe(19);
      expect(DATETIME_FORMAT_WITH_SECONDS).toBe("YYYY-MM-DDTHH:mm:ss");
      expect(DATETIME_FORMAT_WITHOUT_SECONDS).toBe("YYYY-MM-DDTHH:mm");
    });
  });

  describe("detectDateTimeFormat", () => {
    it("should return format with seconds for length >= 19", () => {
      expect(detectDateTimeFormat("2024-01-15T10:30:45")).toBe(
        DATETIME_FORMAT_WITH_SECONDS
      );
      expect(detectDateTimeFormat("2024-01-15T10:30:45")).toBe(
        "YYYY-MM-DDTHH:mm:ss"
      );
    });

    it("should return format without seconds for length < 19", () => {
      expect(detectDateTimeFormat("2024-01-15T10:30")).toBe(
        DATETIME_FORMAT_WITHOUT_SECONDS
      );
      expect(detectDateTimeFormat("2024-01-15T10:30")).toBe("YYYY-MM-DDTHH:mm");
    });

    it("should return format with seconds for length exactly 19", () => {
      const datetime = "2024-01-15T10:30:45";
      expect(datetime.length).toBe(19);
      expect(detectDateTimeFormat(datetime)).toBe(DATETIME_FORMAT_WITH_SECONDS);
    });

    it("should return format without seconds for length 16", () => {
      const datetime = "2024-01-15T10:30";
      expect(datetime.length).toBe(16);
      expect(detectDateTimeFormat(datetime)).toBe(
        DATETIME_FORMAT_WITHOUT_SECONDS
      );
    });

    it("should return format with seconds for length > 19", () => {
      const datetime = "2024-01-15T10:30:45.123";
      expect(datetime.length).toBeGreaterThan(19);
      expect(detectDateTimeFormat(datetime)).toBe(DATETIME_FORMAT_WITH_SECONDS);
    });

    it("should handle empty string", () => {
      expect(detectDateTimeFormat("")).toBe(DATETIME_FORMAT_WITHOUT_SECONDS);
    });

    it("should handle very short strings", () => {
      expect(detectDateTimeFormat("2024")).toBe(
        DATETIME_FORMAT_WITHOUT_SECONDS
      );
    });
  });

  describe("convertFormDateTimeToISO", () => {
    const originalConsoleWarn = console.warn;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it("should convert valid datetime without seconds to ISO string", () => {
      const result = convertFormDateTimeToISO(
        "2024-01-15T10:30",
        "America/New_York"
      );
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should convert valid datetime with seconds to ISO string", () => {
      const result = convertFormDateTimeToISO(
        "2024-01-15T10:30:45",
        "America/New_York"
      );
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should use Etc/UTC as default timezone when timezone is empty", () => {
      const result = convertFormDateTimeToISO("2024-01-15T10:30", "");
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should return empty string for empty datetime input", () => {
      const result = convertFormDateTimeToISO("", "America/New_York");
      expect(result).toBe("");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should return empty string and log warning for invalid datetime", () => {
      const result = convertFormDateTimeToISO(
        "invalid-date",
        "America/New_York"
      );
      expect(result).toBe("");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[convertFormDateTimeToISO] Invalid datetime:")
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"invalid-date"')
      );
    });

    it("should return empty string and log warning for invalid format", () => {
      const result = convertFormDateTimeToISO(
        "2024-13-45T25:99:99",
        "America/New_York"
      );
      expect(result).toBe("");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should handle different timezones correctly", () => {
      const result1 = convertFormDateTimeToISO(
        "2024-01-15T10:30",
        "America/New_York"
      );
      const result2 = convertFormDateTimeToISO(
        "2024-01-15T10:30",
        "Europe/London"
      );
      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(result1).not.toBe(result2);
    });

    it("should handle edge case with null/undefined timezone", () => {
      const result = convertFormDateTimeToISO(
        "2024-01-15T10:30",
        // @ts-ignore - testing edge case
        null
      );
      expect(result).toBeTruthy();
    });

    it("should convert correctly for UTC timezone", () => {
      const result = convertFormDateTimeToISO("2024-01-15T10:30", "Etc/UTC");
      expect(result).toBeTruthy();
      expect(result).toContain("T10:30:00");
    });

    it("should handle datetime at boundary (exactly 19 characters)", () => {
      const datetime = "2024-01-15T10:30:45";
      expect(datetime.length).toBe(19);
      const result = convertFormDateTimeToISO(datetime, "Etc/UTC");
      expect(result).toBeTruthy();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should handle datetime at boundary (exactly 16 characters)", () => {
      const datetime = "2024-01-15T10:30";
      expect(datetime.length).toBe(16);
      const result = convertFormDateTimeToISO(datetime, "Etc/UTC");
      expect(result).toBeTruthy();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
