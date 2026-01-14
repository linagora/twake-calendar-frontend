import { api } from "../../../../src/utils/apiUtils";
import { fetchWebSocketTicket } from "../../../../src/websocket/api/fetchWebSocketTicket";

jest.mock("../../../../src/utils/apiUtils");

describe("fetchWebSocketTicket", () => {
  const mockTicket = {
    clientAddress: "127.0.0.1",
    value: "test-ticket-123",
    generatedOn: "2025-01-12T10:00:00Z",
    validUntil: "2025-01-12T11:00:00Z",
    username: "testuser",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch ticket successfully", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    });

    const ticket = await fetchWebSocketTicket();

    expect(api.post).toHaveBeenCalledWith("ws/ticket");
    expect(ticket).toEqual(mockTicket);
  });

  it("should throw error when response is not ok", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      ok: false,
    });

    await expect(fetchWebSocketTicket()).rejects.toThrow(
      "Failed to fetch WebSocket ticket"
    );
  });

  it("should throw error when network fails", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Network error"));

    await expect(fetchWebSocketTicket()).rejects.toThrow("Network error");
  });
});
