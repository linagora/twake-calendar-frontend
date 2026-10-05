import { withHighContrast } from '@common/theme/highContrastTheme'

describe('withHighContrast', () => {
  const base = { palette: { primary: { main: '#F67E35' } } }

  it('leaves the theme untouched while the mode is off', () => {
    expect(withHighContrast(base, false, 'fr', 'private')).toBe(base)
  })

  it('translates the MUI texts into the user language', () => {
    const options = withHighContrast(base, true, 'fr-fr', 'private') as {
      components: { MuiAlert: { defaultProps: { closeText: string } } }
    }

    expect(options.components.MuiAlert.defaultProps.closeText).toBe('Fermer')
  })

  it('keeps the application theme underneath', () => {
    const options = withHighContrast(base, true, 'en', 'public')

    expect(options?.palette).toBeDefined()
  })
})

describe('HIGH_CONTRAST_COLORS', () => {
  // WCAG 2.1 relative luminance and contrast ratio
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    const [r, g, b] = channels.map(c =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    )
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a: string, b: string): number => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
  }
  const WHITE = '#FFFFFF'
  const PAGE_BACKGROUND = '#F3F6F9'
  const { HIGH_CONTRAST_COLORS: c } = jest.requireActual(
    '@common/theme/highContrastTheme'
  )

  const mains = [
    c.primary.private.main,
    c.primary.public.main,
    c.error.main,
    c.warning.main,
    c.success.main,
    c.info.main
  ]

  it.each(mains)('%s carries white text and reads as text (4.5:1)', main => {
    expect(contrast(WHITE, main)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(main, PAGE_BACKGROUND)).toBeGreaterThanOrEqual(4.5)
  })

  it('makes placeholders readable (4.5:1)', () => {
    expect(contrast(c.placeholder, WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it('makes field borders perceivable (3:1)', () => {
    expect(contrast(c.border, WHITE)).toBeGreaterThanOrEqual(3)
  })
})
