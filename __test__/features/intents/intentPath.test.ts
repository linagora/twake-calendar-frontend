import {
  intentsRedirectUri,
  isIntentsCallbackPath,
  isUnderIntentsPath,
  parseIntentPath
} from '@common/features/intents/intentPath'

// Another app of the Workplace (Twake Chat) asks Calendar for a new event
// with a cozy-stack intent: the stack frames /intents?intent=<id> (the href
// of the intent in the manifest), and the SSO comes back to /intents/callback
describe('the address of the intents page', () => {
  it('reads the intent id of the intents page', () => {
    expect(parseIntentPath('/intents?intent=abc-123_X')).toBe('abc-123_X')
    expect(parseIntentPath('/Intents/?intent=abc')).toBe('abc')
  })

  it('keeps the id when the page has other parameters', () => {
    expect(parseIntentPath('/intents?intent=abc&lang=fr')).toBe('abc')
  })

  it('refuses another path, a missing id, or an id that is no stack id', () => {
    expect(parseIntentPath('/newEvent?intent=abc')).toBe(null)
    expect(parseIntentPath('/embed/newEvent?intent=abc')).toBe(null)
    expect(parseIntentPath('/intents')).toBe(null)
    expect(parseIntentPath('/intents?intent=')).toBe(null)
    // The id ends up in a URL of the stack, called with a token
    expect(parseIntentPath('/intents?intent=../settings')).toBe(null)
    expect(parseIntentPath('/intents?intent=a%3Bb')).toBe(null)
  })
})

describe('the paths of the intents page', () => {
  it('holds every path under /intents, never a path of the calendar', () => {
    expect(isUnderIntentsPath('/intents')).toBe(true)
    expect(isUnderIntentsPath('/intents/')).toBe(true)
    expect(isUnderIntentsPath('/Intents/callback')).toBe(true)
    expect(isUnderIntentsPath('/intents/settings')).toBe(true)
    expect(isUnderIntentsPath('/intentsX')).toBe(false)
    expect(isUnderIntentsPath('/calendar')).toBe(false)
    expect(isUnderIntentsPath('/calendar/intents')).toBe(false)
    expect(isUnderIntentsPath('/callback')).toBe(false)
  })

  it('has its own login callback, apart from the one of the calendar', () => {
    expect(isIntentsCallbackPath('/intents/callback')).toBe(true)
    expect(isIntentsCallbackPath('/intents/callback/')).toBe(true)
    expect(isIntentsCallbackPath('/callback')).toBe(false)
    expect(isIntentsCallbackPath('/intents')).toBe(false)
  })

  it('comes back from the SSO to /intents/callback, on the origin of the redirect URI of the calendar', () => {
    expect(intentsRedirectUri('https://calendar.example.com/callback')).toBe(
      'https://calendar.example.com/intents/callback'
    )
    expect(
      intentsRedirectUri('https://calendar.example.com/login/callback.html')
    ).toBe('https://calendar.example.com/intents/callback')
  })
})
