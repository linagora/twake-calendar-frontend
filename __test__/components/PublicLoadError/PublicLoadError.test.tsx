import { PublicLoadError } from '@public/components/PublicLoadError'
import { render } from '@testing-library/react'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

describe('PublicLoadError (#1790)', () => {
  beforeEach(() => {
    document.title = 'Twake Calendar'
  })

  it('names the tab after the error of a page that failed to load', () => {
    render(<PublicLoadError title="This booking link is not found." />)

    expect(document.title).toBe(
      'This booking link is not found. – Twake Calendar'
    )
  })
})
