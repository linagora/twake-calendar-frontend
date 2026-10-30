import fs from 'fs'
import Polyglot from 'node-polyglot'
import path from 'path'
import de from '@common/locales/de.json'

// The package exports no locale: read the English one next to its entry point
const readBarLocale = (lang: string): { twakeBar: Record<string, string> } =>
  JSON.parse(
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve('@linagora/twake-bar')),
        'locales',
        `${lang}.json`
      ),
      'utf8'
    )
  )

describe('Twake bar strings in German', () => {
  // @linagora/twake-bar ships no German locale: calendar's German locale
  // gives the bar its strings, which the bar merges with its own
  const english = readBarLocale('en').twakeBar
  const polyglot = new Polyglot({ locale: 'de', phrases: de })

  it.each(Object.keys(english))('translates twakeBar.%s', key => {
    const translation = polyglot.t(`twakeBar.${key}`)

    expect(translation).not.toBe(`twakeBar.${key}`)
    expect(translation).not.toBe(english[key])
  })

  it('names the log-out item', () => {
    expect(polyglot.t('twakeBar.logOut')).toBe('Abmelden')
  })
})
