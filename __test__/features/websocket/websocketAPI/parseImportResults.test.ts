import { parseImportResults } from '@common/websocket/messaging/parseImportResults'

describe('parseImportResults', () => {
  it('should return nothing for non-object messages', () => {
    expect(parseImportResults(null)).toEqual([])
    expect(parseImportResults('string')).toEqual([])
    expect(parseImportResults(123)).toEqual([])
  })

  it('should return nothing for a plain calendar change', () => {
    expect(
      parseImportResults({ '/calendars/cal1/entry1': { syncToken: 'abc' } })
    ).toEqual([])
  })

  it('should extract a completed import', () => {
    const message = {
      '/calendars/cal1/entry1': {
        imports: {
          importId: { status: 'completed', succeedCount: 42, failedCount: 1 }
        }
      }
    }

    expect(parseImportResults(message)).toEqual([
      { status: 'completed', succeedCount: 42, failedCount: 1 }
    ])
  })

  it('should extract a failed import without counts', () => {
    const message = {
      '/calendars/cal1/entry1': {
        imports: { importId: { status: 'failed' } }
      }
    }

    expect(parseImportResults(message)).toEqual([
      { status: 'failed', succeedCount: 0, failedCount: 0 }
    ])
  })

  it.each([0.1, -1, Infinity, -Infinity, NaN, 2 ** 53])(
    'should read a count of %p as 0',
    count => {
      const message = {
        '/calendars/cal1/entry1': {
          imports: {
            importId: {
              status: 'completed',
              succeedCount: count,
              failedCount: count
            }
          }
        }
      }

      expect(parseImportResults(message)).toEqual([
        { status: 'completed', succeedCount: 0, failedCount: 0 }
      ])
    }
  )

  it('should ignore imports with an unknown status', () => {
    const message = {
      '/calendars/cal1/entry1': {
        imports: { importId: { status: 'running' } }
      }
    }

    expect(parseImportResults(message)).toEqual([])
  })
})
