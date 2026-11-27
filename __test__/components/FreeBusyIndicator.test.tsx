import { FreeBusyIndicator } from '@common/components/Attendees/FreeBusyIndicator'
import en from '@common/locales/en.json'
import { Chip } from '@linagora/twake-mui'
import { render, screen } from '@testing-library/react'
import I18n from 'twake-i18n'

describe('FreeBusyIndicator', () => {
  it.each([
    { status: 'busy', isResource: false, label: en.event.freeBusy.busy },
    { status: 'unknown', isResource: false, label: en.event.freeBusy.unknown },
    { status: 'contact', isResource: false, label: en.event.freeBusy.contact },
    { status: 'busy', isResource: true, label: en.event.freeBusy.resourceBusy },
    {
      status: 'unknown',
      isResource: true,
      label: en.event.freeBusy.resourceUnknown
    }
  ] as const)(
    'exposes $label before the tooltip opens',
    ({ status, isResource, label }) => {
      render(
        <I18n lang="en" dictRequire={(): typeof en => en}>
          <Chip
            label="Calendar entry"
            onDelete={vi.fn()}
            icon={<FreeBusyIndicator status={status} isResource={isResource} />}
          />
        </I18n>
      )

      const icon = screen.getByRole('img', { name: label })
      expect(
        screen.getByRole('button', { name: `${label} Calendar entry` })
      ).toContainElement(icon)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(icon).not.toHaveAttribute('title')
      expect(icon.querySelector('title')).toBeNull()
    }
  )
})
