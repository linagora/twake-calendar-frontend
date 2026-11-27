import { createMouseHandlers } from '@common/components/Calendar/handlers/mouseHandlers'

describe('createMouseHandlers', () => {
  let calendarEl: HTMLElement
  let column: HTMLElement
  let event: HTMLElement

  beforeEach(() => {
    calendarEl = document.createElement('div')
    calendarEl.innerHTML = `
      <div class="fc-timegrid-body">
        <div class="fc-timegrid-col">
          <div class="fc-event" data-testid="event"></div>
        </div>
      </div>`
    document.body.appendChild(calendarEl)
    column = calendarEl.querySelector('.fc-timegrid-col') as HTMLElement
    event = calendarEl.querySelector('.fc-event') as HTMLElement
    // A day column 480px high: 48 half-hour slots of 10px
    column.getBoundingClientRect = (): DOMRect =>
      ({ top: 0, bottom: 480, left: 0, right: 100, height: 480 }) as DOMRect
    createMouseHandlers({ calendarEl }).addMouseEventListeners()
  })

  afterEach(() => {
    calendarEl.remove()
  })

  const moveOver = (target: HTMLElement): void => {
    target.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 25 })
    )
  }

  it('highlights the half-hour slot under the pointer', () => {
    moveOver(column)

    const highlight = column.querySelector<HTMLElement>('.hour-highlight')
    expect(highlight).toBeInTheDocument()
    expect(highlight?.style.top).toBe('20px')
  })

  it('highlights no slot while the pointer is on an event', () => {
    moveOver(column)
    moveOver(event)

    expect(column.querySelector('.hour-highlight')).toBe(null)
  })
})
