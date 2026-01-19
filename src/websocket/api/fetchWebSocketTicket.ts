import { api } from "@/utils/apiUtils";
import { WebSocketTicket } from "./types";

export async function fetchWebSocketTicket(): Promise<WebSocketTicket> {
  const response = await api.post("ws/ticket");

  if (!response.ok) {
    throw new Error("Failed to fetch WebSocket ticket");
  }

  return response.json();
}
