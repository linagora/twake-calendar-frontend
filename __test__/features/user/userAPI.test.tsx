import { clientConfig } from "../../../src/features/User/oidcAuth";
import {
  getOpenPaasUser,
  updateUserConfigurations,
} from "../../../src/features/User/userAPI";
import { api } from "../../../src/utils/apiUtils";

jest.mock("../../../src/utils/apiUtils");

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
  it("should PUT configurations with language update", async () => {
    const mockResponse = { status: 204 };
    (api.put as jest.Mock).mockResolvedValue(mockResponse);

    await updateUserConfigurations({ language: "vi" });

    expect(api.put).toHaveBeenCalledWith("api/configurations?scope=user", {
      json: [
        {
          name: "core",
          configurations: [{ name: "language", value: "vi" }],
        },
      ],
    });
  });

  it("should PUT configurations with multiple updates", async () => {
    const mockResponse = { status: 204 };
    (api.put as jest.Mock).mockResolvedValue(mockResponse);

    await updateUserConfigurations({
      language: "fr",
      timezone: "Europe/Paris",
    });

    expect(api.put).toHaveBeenCalledWith("api/configurations?scope=user", {
      json: [
        {
          name: "core",
          configurations: [
            { name: "language", value: "fr" },
            { name: "timezone", value: "Europe/Paris" },
          ],
        },
      ],
    });
  });

  it("should handle empty updates", async () => {
    const mockResponse = { status: 204 };
    (api.put as jest.Mock).mockResolvedValue(mockResponse);

    await updateUserConfigurations({});

    expect(api.put).toHaveBeenCalledWith("api/configurations?scope=user", {
      json: [],
    });
  });
});
