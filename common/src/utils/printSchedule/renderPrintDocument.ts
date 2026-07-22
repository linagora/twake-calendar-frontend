import './dayjsSetup'
import { Dayjs } from 'dayjs'
import { PositionedEvent, layoutTimedEvents } from './layout'
import { eventsInPeriod } from './selectPrintEvents'
import { PrintEvent, PrintLabels, PrintPeriod } from './types'

/** Vertical hour window a time grid is cropped to, in whole hours [0, 24]. */
interface HourRange {
  min: number
  max: number
}

const HOUR_HEIGHT = 42
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 19

export interface RenderPrintDocumentOptions {
  periods: PrintPeriod[]
  events: PrintEvent[]
  labels: PrintLabels
  locale: string
}

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const eventStyle = (color?: string): string =>
  color
    ? `background:${esc(color)};border-left-color:${esc(color)};`
    : 'background:#5b6b8c;border-left-color:#3f4c66;'

const timedEventLabel = (event: PrintEvent): string =>
  `${event.start.format('HH:mm')}–${event.end.format('HH:mm')}`

const chip = (event: PrintEvent, withTime: boolean): string => {
  const time = withTime && !event.allDay ? `${event.start.format('HH:mm')} ` : ''
  return (
    `<div class="chip" style="${eventStyle(event.color)}">` +
    `<span class="chip-time">${esc(time)}</span>${esc(event.title)}` +
    '</div>'
  )
}

const hourBounds = (timed: PrintEvent[]): HourRange => {
  let min = DEFAULT_START_HOUR
  let max = DEFAULT_END_HOUR
  timed.forEach(event => {
    min = Math.min(min, event.start.hour())
    const endHour = event.end.hour() + (event.end.minute() > 0 ? 1 : 0)
    max = Math.max(max, endHour)
  })
  return { min: Math.max(0, min), max: Math.min(24, Math.max(max, min + 1)) }
}

const daysOfPeriod = (period: PrintPeriod): Dayjs[] => {
  if (period.scale === 'day') return [period.start]
  return Array.from({ length: 7 }, (_, i) => period.start.add(i, 'day'))
}

const renderTimedEvent = (
  { event, column, columns }: PositionedEvent,
  dayStart: Dayjs,
  { min, max }: HourRange
): string => {
  const minMinutes = min * 60
  const maxMinutes = max * 60
  const startMin = Math.max(minMinutes, event.start.diff(dayStart, 'minute'))
  const endMin = Math.min(maxMinutes, event.end.diff(dayStart, 'minute'))
  const top = ((startMin - minMinutes) / 60) * HOUR_HEIGHT
  const height = Math.max(16, ((endMin - startMin) / 60) * HOUR_HEIGHT)
  const width = 100 / columns
  const location = event.location
    ? `<div class="ev-loc">${esc(event.location)}</div>`
    : ''

  return (
    `<div class="ev" style="top:${top.toFixed(1)}px;height:${height.toFixed(1)}px;` +
    `left:${(column * width).toFixed(2)}%;width:${width.toFixed(2)}%;${eventStyle(event.color)}">` +
    `<div class="ev-time">${esc(timedEventLabel(event))}</div>` +
    `<div class="ev-title">${esc(event.title)}</div>${location}</div>`
  )
}

const renderDayColumn = (
  day: Dayjs,
  timed: PrintEvent[],
  bounds: HourRange
): string => {
  const dayStart = day.startOf('day')
  const dayEnd = dayStart.add(1, 'day')
  const forDay = timed.filter(
    event => event.start.isBefore(dayEnd) && event.end.isAfter(dayStart)
  )
  const blocks = layoutTimedEvents(forDay)
    .map(placement => renderTimedEvent(placement, dayStart, bounds))
    .join('')

  return `<div class="tg-col">${blocks}</div>`
}

const renderTimeGrid = (
  period: PrintPeriod,
  periodEvents: PrintEvent[],
  labels: PrintLabels,
  locale: string
): string => {
  const days = daysOfPeriod(period)
  const timed = periodEvents.filter(event => !event.allDay)
  const allDay = periodEvents.filter(event => event.allDay)
  const bounds = hourBounds(timed)
  const { min, max } = bounds

  const headCells = days
    .map(day => {
      const localized = day.locale(locale)
      return (
        '<div class="tg-dayhead">' +
        `<span class="tg-dow">${esc(localized.format('ddd'))}</span>` +
        `<span class="tg-dom">${esc(localized.format('D'))}</span></div>`
      )
    })
    .join('')

  const allDayCells = days
    .map(day => {
      const dayStart = day.startOf('day')
      const dayEnd = dayStart.add(1, 'day')
      const chips = allDay
        .filter(
          event => event.start.isBefore(dayEnd) && event.end.isAfter(dayStart)
        )
        .map(event => chip(event, false))
        .join('')
      return `<div class="tg-allday-col">${chips}</div>`
    })
    .join('')

  const hours = Array.from({ length: max - min }, (_, i) => min + i)
  const timeLabels = hours
    .map(
      hour =>
        `<div class="tg-time">${String(hour).padStart(2, '0')}:00</div>`
    )
    .join('')

  const columns = days
    .map(day => renderDayColumn(day, timed, bounds))
    .join('')

  const gridHeight = (max - min) * HOUR_HEIGHT
  const gridStyle =
    `--hour-height:${HOUR_HEIGHT}px;height:${gridHeight}px;` +
    `background-size:100% ${HOUR_HEIGHT}px;`

  return (
    `<div class="tg tg-${days.length}">` +
    `<div class="tg-head"><div class="tg-corner"></div>${headCells}</div>` +
    `<div class="tg-allday"><div class="tg-allday-label">${esc(labels.allDay)}</div>${allDayCells}</div>` +
    '<div class="tg-body">' +
    `<div class="tg-times">${timeLabels}</div>` +
    `<div class="tg-cols" style="${gridStyle}">${columns}</div>` +
    '</div></div>'
  )
}

const renderMonthGrid = (
  period: PrintPeriod,
  periodEvents: PrintEvent[],
  locale: string
): string => {
  const gridStart = period.start.startOf('isoWeek')
  const gridEnd = period.end.subtract(1, 'day').endOf('isoWeek')
  const weekCount = Math.ceil(gridEnd.diff(gridStart, 'day') / 7)

  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    `<div class="mg-dow">${esc(gridStart.add(i, 'day').locale(locale).format('ddd'))}</div>`
  ).join('')

  const weeks = Array.from({ length: weekCount }, (_, w) => {
    const cells = Array.from({ length: 7 }, (_, d) => {
      const day = gridStart.add(w * 7 + d, 'day')
      const dayStart = day.startOf('day')
      const dayEnd = dayStart.add(1, 'day')
      const outside = day.month() !== period.start.month() ? ' mg-outside' : ''
      const chips = periodEvents
        .filter(
          event => event.start.isBefore(dayEnd) && event.end.isAfter(dayStart)
        )
        .sort((a, b) => a.start.valueOf() - b.start.valueOf())
        .map(event => chip(event, true))
        .join('')
      return (
        `<div class="mg-cell${outside}">` +
        `<div class="mg-daynum">${esc(day.locale(locale).format('D'))}</div>` +
        `<div class="mg-chips">${chips}</div></div>`
      )
    }).join('')
    return `<div class="mg-week">${cells}</div>`
  }).join('')

  return (
    `<div class="mg"><div class="mg-head">${weekdayNames}</div>` +
    `<div class="mg-weeks">${weeks}</div></div>`
  )
}

const renderPage = (
  period: PrintPeriod,
  events: PrintEvent[],
  labels: PrintLabels,
  locale: string
): string => {
  const periodEvents = eventsInPeriod(events, period)
  const grid =
    period.scale === 'month'
      ? renderMonthGrid(period, periodEvents, locale)
      : renderTimeGrid(period, periodEvents, labels, locale)

  return (
    '<section class="page">' +
    `<h1 class="page-title">${esc(period.label)}</h1>${grid}</section>`
  )
}

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Roboto, Arial, Helvetica, sans-serif; color: #1a2233; }
  .page { page-break-after: always; padding: 16px 20px; }
  .page:last-child { page-break-after: auto; }
  .page-title { font-size: 18px; font-weight: 600; margin: 0 0 12px; text-transform: capitalize; }
  .chip { font-size: 10px; line-height: 1.3; color: #fff; border-radius: 4px; border-left: 3px solid; padding: 1px 4px; margin: 1px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip-time { font-weight: 600; }
  .tg { border: 1px solid #d5d9e2; border-radius: 6px; overflow: hidden; }
  .tg-head { display: flex; border-bottom: 1px solid #d5d9e2; }
  .tg-corner { width: 56px; flex: none; }
  .tg-dayhead { flex: 1; text-align: center; padding: 6px 2px; border-left: 1px solid #eceef3; }
  .tg-dow { display: block; font-size: 11px; color: #6b7488; text-transform: uppercase; }
  .tg-dom { display: block; font-size: 16px; font-weight: 600; }
  .tg-allday { display: flex; border-bottom: 1px solid #d5d9e2; background: #fafbfc; min-height: 20px; }
  .tg-allday-label { width: 56px; flex: none; font-size: 9px; color: #6b7488; text-align: right; padding: 3px 4px; text-transform: uppercase; }
  .tg-allday-col { flex: 1; border-left: 1px solid #eceef3; padding: 2px; }
  .tg-body { display: flex; }
  .tg-times { width: 56px; flex: none; }
  .tg-time { height: var(--hour-height, 42px); font-size: 10px; color: #6b7488; text-align: right; padding-right: 6px; transform: translateY(-6px); }
  .tg-cols { flex: 1; display: flex; background-image: linear-gradient(to bottom, #eceef3 1px, transparent 1px); background-repeat: repeat-y; }
  .tg-col { flex: 1; position: relative; border-left: 1px solid #eceef3; }
  .ev { position: absolute; border-radius: 4px; border-left: 3px solid; color: #fff; padding: 1px 3px; overflow: hidden; font-size: 10px; line-height: 1.2; }
  .ev-time { font-weight: 600; }
  .ev-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ev-loc { font-size: 9px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mg { border: 1px solid #d5d9e2; border-radius: 6px; overflow: hidden; }
  .mg-head { display: flex; border-bottom: 1px solid #d5d9e2; }
  .mg-dow { flex: 1; text-align: center; font-size: 11px; color: #6b7488; text-transform: uppercase; padding: 5px 0; border-left: 1px solid #eceef3; }
  .mg-dow:first-child { border-left: none; }
  .mg-week { display: flex; border-top: 1px solid #eceef3; }
  .mg-week:first-child { border-top: none; }
  .mg-cell { flex: 1; min-height: 88px; border-left: 1px solid #eceef3; padding: 2px; overflow: hidden; }
  .mg-cell:first-child { border-left: none; }
  .mg-outside { background: #f6f7f9; color: #9aa2b1; }
  .mg-daynum { font-size: 11px; font-weight: 600; text-align: right; padding: 0 2px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
  }
`

/**
 * Builds a standalone, print-ready HTML document with one page per period.
 * The document auto-triggers the browser print dialog on load, from which the
 * user can save it as a PDF.
 */
export const renderPrintDocument = ({
  periods,
  events,
  labels,
  locale
}: RenderPrintDocumentOptions): string => {
  const pages = periods
    .map(period => renderPage(period, events, labels, locale))
    .join('')

  return (
    '<!DOCTYPE html>' +
    `<html lang="${esc(locale)}"><head><meta charset="utf-8">` +
    `<title>${esc(labels.documentTitle)}</title>` +
    `<style>${STYLES}</style></head>` +
    `<body>${pages}` +
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' +
    '</body></html>'
  )
}
