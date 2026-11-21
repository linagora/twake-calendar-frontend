import { act } from '@testing-library/react'

// jsdom lays nothing out: in a test that installs it, the content of the page
// takes `layout`, as every element the page observes reports it, by whichever
// measure the page reads (the entries of its ResizeObserver, or the element
// itself). Shared by the specs of the intents pages, which ask the client
// for the size of their content (cozy-interapp's resizeClient).
const layout = { width: 900, height: 640 }

type Observer = {
  callback: ResizeObserverCallback
  targets: Set<Element>
  self: ResizeObserver
}
const observers = new Set<Observer>()

const measure = (target: Element): void => {
  const sizes = {
    scrollHeight: () => layout.height,
    offsetHeight: () => layout.height,
    clientHeight: () => layout.height,
    scrollWidth: () => layout.width,
    offsetWidth: () => layout.width,
    clientWidth: () => layout.width
  }
  for (const [name, get] of Object.entries(sizes)) {
    Object.defineProperty(target, name, { configurable: true, get })
  }
  target.getBoundingClientRect = (): DOMRect => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: layout.width,
    height: layout.height,
    right: layout.width,
    bottom: layout.height,
    toJSON: () => ({})
  })
}

const entryOf = (target: Element): ResizeObserverEntry => {
  const box = [{ inlineSize: layout.width, blockSize: layout.height }]
  return {
    target,
    contentRect: target.getBoundingClientRect(),
    borderBoxSize: box,
    contentBoxSize: box,
    devicePixelContentBoxSize: box
  }
}

const notify = (observer: Observer): void => {
  const entries = [...observer.targets].map(entryOf)
  if (entries.length > 0) observer.callback(entries, observer.self)
}

// As a browser does: each observed element is reported once observed, then
// on every change of its size
class LayoutResizeObserver {
  private readonly observer: Observer

  constructor(callback: ResizeObserverCallback) {
    this.observer = {
      callback,
      targets: new Set(),
      self: this
    }
    observers.add(this.observer)
  }

  observe(target: Element): void {
    measure(target)
    this.observer.targets.add(target)
    setTimeout(() => {
      if (!this.observer.targets.has(target)) return
      act(() => {
        this.observer.callback([entryOf(target)], this.observer.self)
      })
    })
  }

  unobserve(target: Element): void {
    this.observer.targets.delete(target)
  }

  disconnect(): void {
    this.observer.targets.clear()
    observers.delete(this.observer)
  }
}

/** Installs the observer, the content of the page `height` px high */
export function installLayout(height: number): void {
  layout.height = height
  vi.stubGlobal('ResizeObserver', LayoutResizeObserver)
}

export function uninstallLayout(): void {
  observers.clear()
  vi.unstubAllGlobals()
}

/** The content of the page takes another height (More options opened...) */
export function resizeContentTo(height: number): void {
  layout.height = height
  act(() => observers.forEach(notify))
}

type Sent = [{ type: string }, string][]

/** The heights the page asked the client for, oldest first */
export const askedHeights = (resizes: Sent): unknown[] =>
  resizes.map(
    ([message]) =>
      (message as { dimensions?: { height?: unknown } }).dimensions?.height
  )

/**
 * The sizes the page asked the client for, oldest first: the width and the
 * height alone, whatever else the page sends
 */
export const askedSizes = (
  resizes: Sent
): { width: unknown; height: unknown }[] =>
  resizes.map(([message]) => {
    const { width, height } =
      (message as { dimensions?: { width?: unknown; height?: unknown } })
        .dimensions ?? {}
    return { width, height }
  })
