import { TdriveFile } from '../hooks/useTdrivePicker'

export function getMessageType(data: unknown): string | undefined {
  if (typeof data === 'string') return data
  if (typeof data === 'object' && data !== null) {
    return (data as Record<string, unknown>).type as string | undefined
  }
  return undefined
}

export function isReadyMessage(typeStr: string | undefined): boolean {
  return typeStr?.endsWith(':ready') ?? false
}

export function extractIntentId(typeStr: string): string {
  return typeStr.split(':')[0]
}

export function buildReadyResponse(intentId: string): object {
  return { type: `${intentId}:send`, payload: {} }
}

export function parseFileSelection(data: unknown): TdriveFile | null {
  if (typeof data !== 'object' || data === null) return null

  const msg = data as Record<string, unknown>
  if (msg.type !== 'intent-response') return null

  const file = msg.file as Record<string, string> | undefined
  if (!file) return null

  return {
    id: file.id,
    name: file.name,
    url: file.url,
    type: file.action === 'sharingLink' ? 'sharingLink' : 'downloadLink'
  }
}
