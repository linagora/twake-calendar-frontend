import { clientConfig } from "../../../src/features/User/oidcAuth";
import getOpenPaasUser from "../../../src/features/User/userAPI";
import { api } from "../../../src/utils/apiUtils";

jest.mock("../../../src/utils/apiUtils");

clientConfig.url = "https://example.com";

describe("getOpenPaasUserId", () => {
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
