import { clientConfig } from "@/features/User/oidcAuth";
import {
  getOpenPaasUser,
  updateUserConfigurations,
} from "@/features/User/userAPI";
import { api } from "@/utils/apiUtils";

jest.mock("@/utils/apiUtils");

clientConfig.url = "https://example.com";

describe("getOpenPaasUser", () => {
  it("should fetch and return user data", async () => {
    const mockUser = { id: "123", name: "OpenPaas User" };

    (api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await getOpenPaasUser();

    expect(api.get).toHaveBeenCalledWith("api/user");
    expect(result).toEqual(mockUser);
  });
});

describe("updateUserConfigurations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should PATCH configurations with language update", async () => {
    const mockResponse = { status: 204 };
    (api.patch as jest.Mock).mockResolvedValue(mockResponse);

    await updateUserConfigurations({ language: "vi" });

    expect(api.patch).toHaveBeenCalledWith("api/configurations?scope=user", {
      json: [
        {
          name: "core",
          configurations: [{ name: "language", value: "vi" }],
        },
      ],
    });
  });

  it("should PATCH configurations with multiple updates", async () => {
    const mockResponse = { status: 204 };
    (api.patch as jest.Mock).mockResolvedValue(mockResponse);

    await updateUserConfigurations({
      language: "fr",
      timezone: "Europe/Paris",
    });

    expect(api.patch).toHaveBeenCalledWith("api/configurations?scope=user", {
      json: [
        {
          name: "core",
          configurations: [
            { name: "language", value: "fr" },
            { name: "datetime", value: { timeZone: "Europe/Paris" } },
          ],
        },
      ],
    });
  });

  it("should handle empty updates without calling API", async () => {
    const result = await updateUserConfigurations({});

    expect(api.patch).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 204 });
  });
});
