import {
  addVideoConferenceToDescription,
  extractVideoConferenceFromDescription,
  generateMeetingId,
  generateMeetingLink,
  removeVideoConferenceFromDescription,
} from "../videoConferenceUtils";

// Mock window object for Node.js environment
const mockWindow = {
  VIDEO_CONFERENCE_BASE_URL: "https://meet.linagora.com",
};

// @ts-ignore
global.window = mockWindow;

describe("videoConferenceUtils", () => {
  describe("generateMeetingId", () => {
    it("should generate meeting ID in correct format", () => {
      const meetingId = generateMeetingId();
      expect(meetingId).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });

    it("should generate different IDs each time", () => {
      const id1 = generateMeetingId();
      const id2 = generateMeetingId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateMeetingLink", () => {
    it("should generate link with default base URL", () => {
      const link = generateMeetingLink();
      expect(link).toMatch(
        /^https:\/\/meet\.linagora\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/
      );
    });

    it("should generate link with custom base URL", () => {
      const customBase = "https://custom-meet.example.com";
      const link = generateMeetingLink(customBase);
      expect(link).toMatch(
        /^https:\/\/custom-meet\.example\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/
      );
    });
  });

  describe("addVideoConferenceToDescription", () => {
    it("should add video conference on first line when description is empty", () => {
      const description = "";
      const meetingLink = "https://meet.linagora.com/abc-defg-hij";
      const result = addVideoConferenceToDescription(description, meetingLink);
      expect(result).toBe("Visio: https://meet.linagora.com/abc-defg-hij");
    });

    it("should add video conference footer to existing description", () => {
      const description = "This is a meeting description.";
      const meetingLink = "https://meet.linagora.com/abc-defg-hij";
      const result = addVideoConferenceToDescription(description, meetingLink);
      expect(result).toBe(
        "This is a meeting description.\nVisio: https://meet.linagora.com/abc-defg-hij"
      );
    });
  });

  describe("extractVideoConferenceFromDescription", () => {
    it("should extract video conference link from description", () => {
      const description =
        "Meeting description.\nVisio: https://meet.linagora.com/abc-defg-hij";
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBe("https://meet.linagora.com/abc-defg-hij");
    });

    it("should return null when no video conference link found", () => {
      const description = "Just a regular meeting description.";
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBeNull();
    });

    it("should return null for empty description", () => {
      const description = "";
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBeNull();
    });
  });

  describe("removeVideoConferenceFromDescription", () => {
    it("should return empty string when description is only the Visio line", () => {
      const description = "Visio: https://meet.linagora.com/abc-defg-hij";
      const result = removeVideoConferenceFromDescription(description);
      expect(result).toBe("");
    });

    it("should remove Visio line when at end of description", () => {
      const description =
        "This is a meeting description.\nVisio: https://meet.linagora.com/abc-defg-hij";
      const result = removeVideoConferenceFromDescription(description);
      expect(result).toBe("This is a meeting description.");
    });

    it("should remove Visio line when in middle of description", () => {
      const description =
        "Line one\nVisio: https://meet.linagora.com/abc-defg-hij\nLine two";
      const result = removeVideoConferenceFromDescription(description);
      expect(result).toBe("Line one\nLine two");
    });

    it("should leave description unchanged when no Visio line present", () => {
      const description = "Just a regular meeting description.";
      const result = removeVideoConferenceFromDescription(description);
      expect(result).toBe(description);
    });

    it("should remove Visio line when at start of description", () => {
      const description =
        "Visio: https://meet.linagora.com/abc-defg-hij\nRest of the text";
      const result = removeVideoConferenceFromDescription(description);
      expect(result).toBe("Rest of the text");
    });
  });
});
