export function setupWebsocket() {
  const originalWebSocket = global.WebSocket
  const webSocketInstances: any[] = []
  const mockWebSocket = vi.fn().mockImplementation(function (url: string) {
    const ws = {
      url,
      readyState: WebSocket.CONNECTING,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      _listeners: {} as Record<string, Function[]>
    }

    ws.addEventListener.mockImplementation((event, handler) => {
      ws._listeners[event] ??= []
      ws._listeners[event].push(handler)
    })

    ws.removeEventListener.mockImplementation((event, handler) => {
      ws._listeners[event] =
        ws._listeners[event]?.filter(h => h !== handler) ?? []
    })

    webSocketInstances.push(ws)
    return ws
  })

  global.WebSocket = mockWebSocket as any
  const cleanup = () => {
    global.WebSocket = originalWebSocket
    webSocketInstances.length = 0
  }
  return { webSocketInstances, mockWebSocket, cleanup }
}
