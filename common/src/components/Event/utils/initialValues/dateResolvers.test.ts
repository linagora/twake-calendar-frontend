import { buildFromSelectedRange, formatEventDates } from './dateResolvers'
import type { CalendarEvent } from '@common/types/EventsTypes'
import type { DateSelectArg } from '@fullcalendar/core'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const allDayRanges = [
  ['a normal date', '2026-09-30', '2026-10-02', '2026-10-01'],
  ['the spring DST transition', '2026-03-07', '2026-03-09', '2026-03-08']
] as const

function selectedRange(start: string, end: string): DateSelectArg {
  return {
    start: new Date(start),
    end: new Date(end),
    startStr: start,
    endStr: end,
    allDay: true
  } as DateSelectArg
}

function resolveDatesInTimezone(timezone: string): {
  formattedEnd: string
  selectedEnd: string
} {
  const script = String.raw`
    const path = require('node:path')
    const Module = require('node:module')
    const originalResolveFilename = Module._resolveFilename

    Module._resolveFilename = function (request, parent, isMain, options) {
      const mapped = request.startsWith('@common/')
        ? path.join(process.cwd(), 'common/src', request.slice('@common/'.length))
        : request
      return originalResolveFilename.call(this, mapped, parent, isMain, options)
    }

    require('ts-node/register/transpile-only')
    const { buildFromSelectedRange, formatEventDates } = require(process.env.RESOLVER_PATH)
    const start = '2026-10-31'
    const end = '2026-11-02'
    const range = {
      start: new Date(start),
      end: new Date(end),
      startStr: start,
      endStr: end,
      allDay: true
    }

    process.stdout.write(JSON.stringify({
      formattedEnd: formatEventDates({ start, end }, true).end,
      selectedEnd: buildFromSelectedRange(range, {}).end
    }))
  `

  return JSON.parse(
    execFileSync(process.execPath, ['-e', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        TZ: timezone,
        RESOLVER_PATH: path.join(__dirname, 'dateResolvers.ts'),
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({
          module: 'CommonJS',
          esModuleInterop: true
        })
      }
    })
  ) as { formattedEnd: string; selectedEnd: string }
}

describe('formatEventDates', () => {
  it.each(allDayRanges)(
    'converts the exclusive all-day end across %s',
    (_case, start, exclusiveEnd, inclusiveEnd) => {
      const event = {
        start,
        end: exclusiveEnd
      } as CalendarEvent

      expect(formatEventDates(event, true)).toEqual({
        start,
        end: inclusiveEnd
      })
    }
  )

  it.each(allDayRanges)(
    'keeps a selected all-day range across %s',
    (_case, start, exclusiveEnd, inclusiveEnd) => {
      expect(
        buildFromSelectedRange(selectedRange(start, exclusiveEnd), {})
      ).toMatchObject({
        start,
        end: inclusiveEnd,
        allday: true
      })
    }
  )

  it('keeps existing events and selected ranges on the right day across the fall DST transition', () => {
    expect(resolveDatesInTimezone('America/New_York')).toEqual({
      formattedEnd: '2026-11-01',
      selectedEnd: '2026-11-01'
    })
  })
})
