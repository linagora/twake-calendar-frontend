import { getInitials, stringToGradient } from "@/utils/avatarUtils";

jest.mock("@linagora/twake-mui", () => ({
  nameToColor: jest.fn((name: string) => {
    if (!name) return undefined;
    const colors = [
      "sunrise",
      "downy",
      "sugarCoral",
      "pinkBonnet",
      "blueMana",
      "nightBlue",
      "snowPea",
      "pluviophile",
      "cornflower",
      "paleGreen",
      "moonBlue",
    ];
    const hash = Array.from(name.toUpperCase())
      .map((letter) => letter.charCodeAt(0))
      .reduce((sum, number) => sum + number, 0);
    return colors[hash % colors.length];
  }),
}));

describe("avatarUtils", () => {
  describe("getInitials", () => {
    it("returns 2-letter initials for full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Alice Smith")).toBe("AS");
      expect(getInitials("Nguyễn Văn")).toBe("NV");
    });

    it("returns single letter for single word", () => {
      expect(getInitials("Alice")).toBe("A");
      expect(getInitials("John")).toBe("J");
    });

    it("returns uppercase initials", () => {
      expect(getInitials("john doe")).toBe("JD");
      expect(getInitials("ALICE SMITH")).toBe("AS");
      expect(getInitials("a")).toBe("A");
    });

    it("handles multiple spaces between words", () => {
      expect(getInitials("John   Doe")).toBe("JD");
      expect(getInitials("Alice    Smith   Brown")).toBe("AS");
    });

    it("handles email addresses", () => {
      expect(getInitials("john.doe@email.com")).toBe("J");
      expect(getInitials("test@example.com")).toBe("T");
    });

    it("handles empty string", () => {
      expect(getInitials("")).toBe("");
    });

    it("handles whitespace-only string", () => {
      expect(getInitials("   ")).toBe("");
    });

    it("handles single character", () => {
      expect(getInitials("A")).toBe("A");
      expect(getInitials("a")).toBe("A");
    });

    it("handles names with special characters", () => {
      expect(getInitials("Jean-Pierre")).toBe("J");
      expect(getInitials("Mary Jane Watson")).toBe("MJ");
    });

    it("handles unicode characters", () => {
      expect(getInitials("Nguyễn Văn")).toBe("NV");
      expect(getInitials("José María")).toBe("JM");
    });

    it("takes first two words for names with more than two words", () => {
      expect(getInitials("John Michael Smith")).toBe("JM");
      expect(getInitials("Alice Bob Charlie")).toBe("AB");
    });
  });

  describe("stringToGradient", () => {
    it("returns color for valid string", () => {
      const result = stringToGradient("John Doe");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("returns same color for same input", () => {
      const result1 = stringToGradient("John Doe");
      const result2 = stringToGradient("John Doe");
      expect(result1).toBe(result2);
    });

    it("returns undefined for empty string", () => {
      expect(stringToGradient("")).toBeUndefined();
    });

    it("returns color for single character", () => {
      const result = stringToGradient("A");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("returns color for email address", () => {
      const result = stringToGradient("test@example.com");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});
