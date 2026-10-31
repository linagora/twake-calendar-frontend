export interface ImportResult {
  status: 'completed' | 'failed'
  succeedCount: number
  failedCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0
}

function toImportResult(value: unknown): ImportResult | undefined {
  if (!isRecord(value)) return undefined
  if (value.status !== 'completed' && value.status !== 'failed') {
    return undefined
  }
  return {
    status: value.status,
    succeedCount: asCount(value.succeedCount),
    failedCount: asCount(value.failedCount)
  }
}

/**
 * Extracts the import outcomes the side service pushes once an import ends:
 * `{ "/calendars/base/id": { "imports": { "<importId>": { "status": "completed", "succeedCount": 2, "failedCount": 0 } } } }`
 */
export function parseImportResults(message: unknown): ImportResult[] {
  if (!isRecord(message)) return []
  return Object.values(message)
    .filter(isRecord)
    .map(value => value.imports)
    .filter(isRecord)
    .flatMap(imports => Object.values(imports))
    .map(toImportResult)
    .filter((result): result is ImportResult => result !== undefined)
}
