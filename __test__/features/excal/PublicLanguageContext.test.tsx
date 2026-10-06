import {
  isValidLanguage,
  getBrowserLanguage,
  getDefaultLanguage
} from '@public/context/PublicLanguageContext'

describe('PublicLanguageContext Localization helpers', () => {
  let languageSpy: jest.SpyInstance
  let languagesSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    languageSpy = jest.spyOn(window.navigator, 'language', 'get')
    languagesSpy = jest.spyOn(window.navigator, 'languages', 'get')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    ;(window as unknown as { LANG: string | undefined }).LANG = undefined
  })

  describe('isValidLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('en')).toBe(true)
      expect(isValidLanguage('fr')).toBe(true)
      expect(isValidLanguage('es')).toBe(true)
      expect(isValidLanguage('de')).toBe(true)
      expect(isValidLanguage('it')).toBe(true)
      expect(isValidLanguage('ru')).toBe(true)
      expect(isValidLanguage('vi')).toBe(true)
    })

    it('should return false for unsupported languages or empty values', () => {
      expect(isValidLanguage('pt')).toBe(false)
      expect(isValidLanguage('')).toBe(false)
      expect(isValidLanguage(null)).toBe(false)
      expect(isValidLanguage(undefined)).toBe(false)
    })
  })

  describe('getBrowserLanguage', () => {
    it('should return primary language code from navigator.language', () => {
      languageSpy.mockReturnValue('fr-FR')
      languagesSpy.mockReturnValue(['fr-FR', 'en-US'])
      expect(getBrowserLanguage()).toBe('fr')
    })

    it('should fallback to navigator.languages[0] if language is missing', () => {
      languageSpy.mockReturnValue('')
      languagesSpy.mockReturnValue(['ru-RU', 'en-US'])
      expect(getBrowserLanguage()).toBe('ru')
    })

    it('should return undefined if language info is missing', () => {
      languageSpy.mockReturnValue(undefined)
      languagesSpy.mockReturnValue(undefined)
      expect(getBrowserLanguage()).toBeUndefined()
    })
  })

  describe('getDefaultLanguage', () => {
    beforeEach(() => {
      ;(window as unknown as { LANG: string | undefined }).LANG = undefined
      languageSpy.mockReturnValue('en-US')
    })

    it('should prioritize saved language in localStorage', () => {
      localStorage.setItem('lang', 'fr')
      ;(window as unknown as { LANG: string | undefined }).LANG = 'ru'
      languageSpy.mockReturnValue('vi-VN')

      expect(getDefaultLanguage()).toBe('fr')
    })

    it('should fallback to browser language if localStorage is not set or invalid', () => {
      localStorage.removeItem('lang')
      ;(window as unknown as { LANG: string | undefined }).LANG = 'ru'
      languageSpy.mockReturnValue('vi-VN')

      expect(getDefaultLanguage()).toBe('vi')

      // Invalid localStorage key
      localStorage.setItem('lang', 'invalid')
      expect(getDefaultLanguage()).toBe('vi')
    })

    it('should fallback to window.LANG if localStorage and browser language are missing or invalid', () => {
      localStorage.removeItem('lang')
      ;(window as unknown as { LANG: string | undefined }).LANG = 'ru'
      languageSpy.mockReturnValue('pt-BR') // unsupported

      expect(getDefaultLanguage()).toBe('ru')
    })

    it('should default to en if everything else is missing or invalid', () => {
      localStorage.removeItem('lang')
      ;(window as unknown as { LANG: string | undefined }).LANG = undefined
      languageSpy.mockReturnValue('pt-BR') // unsupported

      expect(getDefaultLanguage()).toBe('en')
    })
  })
})
