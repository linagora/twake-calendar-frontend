// A copy of the TwakeSpace overlay of @linagora/twake-mui 10.5.1
// (packages/twake-mui/src/components/SpaceOverlay, twake-ui#137), for a
// Calendar still on twake-mui 5: to drop, with this folder, once Calendar
// takes twake-mui 10.4 or later, which exports the same names.
//
// Known trap: a dialog rendered on the overlay lives in another document, so
// `document.getElementById` in this one does not find its paper;
// `components/Dialog/useDynamicPosition.ts` would then request animation
// frames without end. The embed route shows no view with dynamic positioning.
//
// The overlay TwakeSpace puts over its page for an embedded app (ADR 010 of
// twake-space-architecture), from the side of the app.

import type { OverlayBox, OverlayRegion } from '@linagora/twake-embed'

/**
 * Where the overlay stands: looked for (render nothing yet, so that what
 * would render in place does not mount twice), there, or not coming (render
 * in place)
 */
export type SpaceOverlayStatus = 'connecting' | 'connected' | 'unavailable'

/**
 * The overlay TwakeSpace frames over its whole window, on this app's origin:
 * docked windows and dialogs render into its body with portals, so they sit
 * on the page of TwakeSpace instead of inside the app's frame
 */
export interface SpaceOverlay {
  getStatus: () => SpaceOverlayStatus
  /** The body to render into, null unless connected */
  getBody: () => HTMLElement | null
  /** Called when the status changes */
  subscribe: (listener: () => void) => () => void
}

/** Room left around each box for its shadow, in px */
const SHADOW_MARGIN = 16
/**
 * How long a frame named by TwakeSpace waits for its overlay before showing
 * its windows in place: the overlay loads in well under a second, and a
 * TwakeSpace without overlay should not hold a composer back longer
 */
const CONNECT_TIMEOUT_MS = 5_000
/** How often the overlay is looked for while TwakeSpace loads it */
const LOOKUP_INTERVAL_MS = 100
/** Changes of the overlay sent together, about one frame */
const REGION_DELAY_MS = 16
const FOCUS_RETRY_MS = 50

/** The overlay of this window, once looked for */
let connection: { overlay: SpaceOverlay | null } | null = null

/**
 * The overlay of this frame, found by name: TwakeSpace names it after the
 * frame (`<frame name>:overlay`). Null outside a frame or in a frame without
 * a name, where windows and dialogs stay in the app. `reportRegion` tells
 * TwakeSpace the region of the overlay to show.
 *
 * Connected once per window: the app's styles are copied by wrapping the
 * stylesheet methods of its window, so a later call returns the first
 * connection, and its `reportRegion` is ignored.
 */
export function connectSpaceOverlay(
  reportRegion: (region: OverlayRegion) => void
): SpaceOverlay | null {
  connection ??= { overlay: connect(reportRegion) }
  return connection.overlay
}

function connect(
  reportRegion: (region: OverlayRegion) => void
): SpaceOverlay | null {
  if (window.parent === window || window.name === '') return null
  const name = `${window.name}:overlay`
  const listeners = new Set<() => void>()
  let status: SpaceOverlayStatus = 'connecting'
  let body: HTMLElement | null = null

  const settle = (next: SpaceOverlayStatus): void => {
    if (status !== 'connecting') return
    status = next
    listeners.forEach(listener => {
      listener()
    })
  }

  const attach = (doc: Document): void => {
    mirrorStyles(document, doc)
    followRegion(doc, reportRegion, followFocus(document))
    body = doc.body
    settle('connected')
  }

  const giveUp = setTimeout(() => {
    settle('unavailable')
  }, CONNECT_TIMEOUT_MS)
  const find = (): void => {
    if (status !== 'connecting') return
    const overlay = findOverlay(name)
    if (overlay !== null) {
      clearTimeout(giveUp)
      attach(overlay)
      return
    }
    setTimeout(find, LOOKUP_INTERVAL_MS)
  }
  find()

  return {
    getStatus: () => status,
    getBody: () => body,
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

/**
 * The element of the app that last had the focus: a dialog opened from it
 * shows on the overlay, and closing it cannot give the focus back across
 * frames (the focus event carries no `relatedTarget` there)
 */
function followFocus(app: Document): () => HTMLElement | null {
  let last: HTMLElement | null = null
  app.addEventListener('focusin', event => {
    if (event.target !== app.body) last = event.target as HTMLElement
  })
  return () => (last?.isConnected ? last : null)
}

/**
 * The document of the overlay once loaded: until then the frame holds the
 * blank page of TwakeSpace, of another origin
 */
function findOverlay(name: string): Document | null {
  const frames = Array.from(
    { length: window.parent.length },
    (_, index): Window | undefined => window.parent[index]
  )
  for (const frame of frames) {
    try {
      if (
        frame?.name === name &&
        frame.location.href !== 'about:blank' &&
        frame.document.readyState === 'complete'
      ) {
        return frame.document
      }
    } catch {
      // Another origin
    }
  }
  return null
}

/**
 * Copies every CSS rule of the app into the overlay, and again whenever the
 * app adds some: Emotion and its global styles insert rules one by one
 * (`insertRule`), other styles arrive as elements of the head
 */
export function mirrorStyles(source: Document, target: Document): void {
  const sourceWindow = source.defaultView
  if (sourceWindow === null) return
  const mirror = target.createElement('style')
  mirror.dataset.mirror = ''
  target.head.appendChild(mirror)
  const linked = new Set<string>()

  const copy = (): void => {
    const css: string[] = []
    for (const sheet of Array.from(source.styleSheets)) {
      // A stylesheet file is loaded again: its relative URLs (fonts) resolve
      // against it, and the rules of another origin cannot be read
      if (sheet.href !== null) {
        if (!linked.has(sheet.href)) {
          linked.add(sheet.href)
          const link = target.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          target.head.insertBefore(link, mirror)
        }
        continue
      }
      try {
        for (const rule of Array.from(sheet.cssRules)) css.push(rule.cssText)
      } catch {
        // Unreadable: nothing to copy
      }
    }
    mirror.textContent = css.join('\n')
    copyRootAttributes(source.documentElement, target.documentElement)
  }

  let scheduled = false
  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    sourceWindow.requestAnimationFrame(() => {
      scheduled = false
      copy()
    })
  }

  // A rule inserted in the app is in the overlay at once, before what it
  // styles is laid out: a popover measures its paper as it mounts, and a
  // paper without its rules spans the whole window. The copy that follows
  // puts the rule back in its place.
  const copyRule = (sheet: CSSStyleSheet, rule: string): void => {
    const copied = mirror.sheet
    // A stylesheet file is loaded again instead
    if (Boolean(sheet.href) || copied === null || sheet === copied) return
    try {
      copied.insertRule(rule, copied.cssRules.length)
    } catch {
      // Not allowed at the end of a sheet (`@import`): left to the copy
    }
  }

  // Emotion inserts rules without touching the DOM: watch the CSSOM itself
  const prototype = sourceWindow.CSSStyleSheet.prototype
  // eslint-disable-next-line @typescript-eslint/unbound-method -- wrapped, called with its sheet
  const insertRule = prototype.insertRule
  prototype.insertRule = function (this: CSSStyleSheet, ...args): number {
    const index = insertRule.apply(this, args)
    copyRule(this, args[0])
    schedule()
    return index
  }
  // eslint-disable-next-line @typescript-eslint/unbound-method -- wrapped, called with its sheet
  const deleteRule = prototype.deleteRule
  prototype.deleteRule = function (this: CSSStyleSheet, ...args): void {
    schedule()
    deleteRule.apply(this, args)
  }
  new MutationObserver(schedule).observe(source.head, {
    childList: true,
    subtree: true,
    characterData: true
  })
  // The colour scheme and the language live on <html>
  new MutationObserver(schedule).observe(source.documentElement, {
    attributes: true
  })
  copy()
}

function copyRootAttributes(source: HTMLElement, target: HTMLElement): void {
  for (const { name, value } of Array.from(source.attributes)) {
    if (name !== 'style' && target.getAttribute(name) !== value) {
      target.setAttribute(name, value)
    }
  }
}

/**
 * Gives the focus back to an element of the app, again for a moment: while
 * the dialog was open TwakeSpace made its page inert, the app's frame
 * included, and takes that back only once it reads the new region
 */
function restoreFocus(target: HTMLElement, attempts = 10): void {
  target.focus()
  if (target.ownerDocument.activeElement === target && document.hasFocus()) {
    return
  }
  if (attempts > 1) {
    setTimeout(() => {
      restoreFocus(target, attempts - 1)
    }, FOCUS_RETRY_MS)
  }
}

/**
 * Sends TwakeSpace the region of the overlay to show, each time it changes.
 * When a dialog closes and leaves the focus nowhere on the overlay, it goes
 * back to the element of the app that had it.
 */
function followRegion(
  doc: Document,
  reportRegion: (region: OverlayRegion) => void,
  lastAppFocus: () => HTMLElement | null
): void {
  const view = doc.defaultView
  if (view === null) return
  let last = ''
  let scheduled = false
  const send = (): void => {
    scheduled = false
    const region = computeOverlayRegion(doc)
    const key = JSON.stringify(region)
    if (key === last) return
    const wasBlocking = last === '"full"'
    last = key
    reportRegion(region)
    if (wasBlocking && region !== 'full' && doc.activeElement === doc.body) {
      const target = lastAppFocus()
      if (target !== null) restoreFocus(target)
    }
  }
  // Not the overlay's animation frames: the browser does not run them while
  // the overlay shows nothing, which it does until it reports a region
  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    setTimeout(send, REGION_DELAY_MS)
  }
  new MutationObserver(schedule).observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true
  })
  for (const type of ['transitionend', 'transitioncancel', 'animationend']) {
    doc.addEventListener(type, schedule, true)
  }
  view.addEventListener('resize', schedule)
  schedule()
}

/**
 * What the overlay shows: everything while a modal (dialog, menu) or a
 * backdrop is open, otherwise the boxes that paint something. A box that
 * neither takes clicks nor paints (the dock line) is looked through.
 */
export function computeOverlayRegion(doc: Document): OverlayRegion {
  const view = doc.defaultView
  if (view === null) return []
  const blocking = Array.from(
    doc.body.querySelectorAll('.MuiModal-root, .MuiBackdrop-root')
  ).some(
    element =>
      element.closest('.MuiModal-hidden') === null &&
      view.getComputedStyle(element).visibility !== 'hidden'
  )
  if (blocking) return 'full'

  const boxes: OverlayBox[] = []
  const visit = (element: Element): void => {
    const style = view.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return
    if (style.pointerEvents === 'none' && !paints(style)) {
      Array.from(element.children).forEach(visit)
      return
    }
    const box = element.getBoundingClientRect()
    if (box.width > 0 && box.height > 0) {
      boxes.push({
        x: Math.floor(box.left - SHADOW_MARGIN),
        y: Math.floor(box.top - SHADOW_MARGIN),
        width: Math.ceil(box.width + 2 * SHADOW_MARGIN),
        height: Math.ceil(box.height + 2 * SHADOW_MARGIN)
      })
    }
  }
  Array.from(doc.body.children).forEach(visit)
  return boxes
}

function paints(style: CSSStyleDeclaration): boolean {
  const transparent = (color: string): boolean =>
    color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
  return (
    !transparent(style.backgroundColor) ||
    (style.boxShadow !== 'none' && style.boxShadow !== '') ||
    (style.borderStyle !== 'none' &&
      style.borderStyle !== '' &&
      parseFloat(style.borderWidth) > 0)
  )
}
