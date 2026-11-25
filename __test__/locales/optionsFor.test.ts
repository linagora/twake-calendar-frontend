import Polyglot from 'node-polyglot'
import itIT from '@common/locales/it.json'

describe('options menu name', () => {
  it.each([
    ['Il mio calendario', 'Opzioni: Il mio calendario'],
    ['Team A', 'Opzioni: Team A']
  ])(
    'puts the name "%s" after a colon in Italian, so an article in it reads well',
    (name, expected) => {
      const polyglot = new Polyglot({ locale: 'it', phrases: itIT })

      expect(polyglot.t('common.optionsFor', { name })).toBe(expected)
    }
  )
})
