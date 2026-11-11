/**
 * @vitest-environment jsdom
 */
import {
  checkFrameAncestors,
  readAncestorOrigins
} from '@common/features/intents/frameAncestors'

// The stack gives the origins that may frame a service of the intent
// (`frameAncestors`, linagora/cozy-stack#4978, optional); the browser gives
// the pages above the frame (`location.ancestorOrigins`, not in Firefox)
const CHAT = 'https://chat.example.com'
const CHAT_SHELL = 'https://alice-chat.example.com'

describe('who frames the intents page', () => {
  it('trusts a page framed by the client app, in its cozy shell or not', () => {
    expect(checkFrameAncestors([CHAT, CHAT_SHELL], [CHAT])).toBe('trusted')
    expect(checkFrameAncestors([CHAT, CHAT_SHELL], [CHAT, CHAT_SHELL])).toBe(
      'trusted'
    )
  })

  it('refuses an ancestor the stack does not allow', () => {
    expect(
      checkFrameAncestors([CHAT, CHAT_SHELL], [CHAT, 'https://evil.example'])
    ).toBe('untrusted')
    expect(checkFrameAncestors([CHAT], ['https://evil.example'])).toBe(
      'untrusted'
    )
    expect(checkFrameAncestors([CHAT], [])).toBe('untrusted')
  })

  it('cannot check without the origins of the stack (an older stack)', () => {
    expect(checkFrameAncestors(undefined, [CHAT])).toBe('unchecked')
    expect(checkFrameAncestors(null, [CHAT])).toBe('unchecked')
  })

  it('refuses origins given in another shape', () => {
    expect(checkFrameAncestors(CHAT, [CHAT])).toBe('untrusted')
    expect(checkFrameAncestors([42], [CHAT])).toBe('untrusted')
  })

  it('cannot check when the browser does not tell the ancestors (Firefox)', () => {
    expect(checkFrameAncestors([CHAT], null)).toBe('unchecked')
  })
})

describe('the pages above the intents page, as the browser tells them', () => {
  afterEach(() => {
    Reflect.deleteProperty(window.location, 'ancestorOrigins')
  })

  it('are the origins the browser gives, innermost first', () => {
    Object.defineProperty(window.location, 'ancestorOrigins', {
      value: [CHAT, CHAT_SHELL],
      configurable: true
    })

    expect(readAncestorOrigins()).toEqual([CHAT, CHAT_SHELL])
  })

  it('are unknown when the browser does not tell them (Firefox)', () => {
    expect('ancestorOrigins' in window.location).toBe(false)

    expect(readAncestorOrigins()).toBeNull()
  })
})
