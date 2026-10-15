import { EventRepetitionRow } from '@common/components/EventPreview/EventDetailsRows'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import { RepetitionObject } from '@common/types/Repetition'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { render, RenderResult, screen } from '@testing-library/react'
import I18n from 'twake-i18n'

const LOCALES = { en, fr }

type Lang = keyof typeof LOCALES

const renderRow = (
  repetition: RepetitionObject,
  lang: Lang = 'en'
): RenderResult =>
  render(
    <I18n
      lang={lang}
      dictRequire={(l: Lang): (typeof LOCALES)[Lang] => LOCALES[l]}
    >
      <TwakeMuiThemeProvider>
        <EventRepetitionRow repetition={repetition} />
      </TwakeMuiThemeProvider>
    </I18n>
  )

describe('EventRepetitionRow', () => {
  it('describes a weekly series as a sentence', () => {
    renderRow(
      new RepetitionObject({ freq: 'weekly', interval: 1, byday: ['TH'] })
    )

    expect(
      screen.getByText('Recurrent Event · every week on Thursday')
    ).toBeInTheDocument()
  })

  it('does not call an every-2-weeks series weekly', () => {
    renderRow(
      new RepetitionObject({ freq: 'weekly', interval: 2, byday: ['TH'] })
    )

    expect(
      screen.getByText('Recurrent Event · every 2 weeks on Thursday')
    ).toBeInTheDocument()
    expect(screen.queryByText(/weekly/)).not.toBeInTheDocument()
  })

  it('appends the end condition', () => {
    renderRow(
      new RepetitionObject({ freq: 'daily', interval: 3, occurrences: 4 })
    )

    expect(
      screen.getByText('Recurrent Event · every 3 days for 4 occurrences')
    ).toBeInTheDocument()
  })

  it('reads as a sentence in French', () => {
    renderRow(
      new RepetitionObject({ freq: 'weekly', interval: 2, byday: ['TH'] }),
      'fr'
    )

    expect(
      screen.getByText('Événement récurrent · toutes les 2 semaines le jeudi')
    ).toBeInTheDocument()
  })

  it('falls back to the frequency name when no rule can be phrased', () => {
    renderRow(new RepetitionObject({ freq: 'hourly', interval: 1 }))

    expect(screen.getByText('Recurrent Event · hourly')).toBeInTheDocument()
  })

  it('keeps the frequency name next to an end condition', () => {
    renderRow(
      new RepetitionObject({ freq: 'hourly', interval: 1, occurrences: 4 })
    )

    expect(
      screen.getByText('Recurrent Event · hourly for 4 occurrences')
    ).toBeInTheDocument()
  })
})
