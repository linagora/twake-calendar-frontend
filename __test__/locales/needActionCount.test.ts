import Polyglot from 'node-polyglot'
import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import itIT from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'

const locales = { de, en, es, fr, it: itIT, ru, vi }

describe('event preview "waiting" answer count', () => {
  it.each([
    [1, '1 pendiente'],
    [2, '2 pendientes']
  ])('agrees with %i guest(s) in Spanish', (count, expected) => {
    const polyglot = new Polyglot({ locale: 'es', phrases: es })

    expect(
      polyglot.t('eventPreview.needActionCount', { smart_count: count })
    ).toBe(expected)
  })

  it.each(Object.entries(locales))('%s shows the count', (lang, phrases) => {
    const polyglot = new Polyglot({ locale: lang, phrases })

    expect(
      polyglot.t('eventPreview.needActionCount', { smart_count: 5 })
    ).toMatch(/^5 /)
  })
})
