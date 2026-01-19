import { getUserDisplayName } from "@/utils/userUtils";
import { userData } from "@/features/User/userDataTypes";

describe("userUtils", () => {
  describe("getUserDisplayName", () => {
    it("returns full name when user has name and family_name", () => {
      const user: userData = {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        given_name: "John",
        name: "John",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("John Doe");
    });

    it("returns email when user does not have name and family_name", () => {
      const user: userData = {
        sub: "test",
        email: "test@test.com",
        family_name: "",
        given_name: "",
        name: "",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("test@test.com");
    });

    it("returns email when user has only email", () => {
      const user: userData = {
        sub: "test",
        email: "user@example.com",
        family_name: "",
        given_name: "",
        name: "",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("user@example.com");
    });

    it("returns empty string when user is null", () => {
      expect(getUserDisplayName(null)).toBe("");
    });

    it("returns empty string when user is undefined", () => {
      expect(getUserDisplayName(undefined)).toBe("");
    });

    it("returns empty string when user has no name, family_name, or email", () => {
      const user: userData = {
        sub: "test",
        email: "",
        family_name: "",
        given_name: "",
        name: "",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("");
    });

    it("handles user with only name (no family_name)", () => {
      const user: userData = {
        sub: "test",
        email: "test@test.com",
        family_name: "",
        given_name: "John",
        name: "John",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("test@test.com");
    });

    it("handles user with only family_name (no name)", () => {
      const user: userData = {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        given_name: "",
        name: "",
        sid: "mockSid",
      };

      expect(getUserDisplayName(user)).toBe("test@test.com");
    });
  });
});
