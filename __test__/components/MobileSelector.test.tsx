import { MobileSelector } from '@common/components/MobileSelector'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

describe('MobileSelector', () => {
  it('names its bottom sheet after the label and moves focus into it', async () => {
    renderWithProviders(
      <MobileSelector label="Theme" displayText="Dark">
        <button>Light</button>
      </MobileSelector>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))

    const sheet = await screen.findByRole('dialog', { name: 'Theme' })
    await waitFor(() =>
      expect(sheet).toContainElement(document.activeElement as HTMLElement)
    )
  })

  it('hands the label to a sheet rendered by the caller', () => {
    renderWithProviders(
      <MobileSelector
        label="Access right of Bob"
        displayText="Editor"
        bottomSheetChildren={({ open, label }) =>
          open ? <div role="dialog" aria-label={label} /> : null
        }
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Access right of Bob: Editor' })
    )

    expect(
      screen.getByRole('dialog', { name: 'Access right of Bob' })
    ).toBeInTheDocument()
  })

  it('does not repeat a value equal to the label', () => {
    renderWithProviders(
      <MobileSelector label="Organizers" displayText="Organizers" />
    )

    expect(
      screen.getByRole('button', { name: 'Organizers' })
    ).toBeInTheDocument()
  })

  it('keeps naming the button by a value that is not plain text', () => {
    renderWithProviders(
      <MobileSelector
        label="Import to"
        displayText={<span>Work calendar</span>}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Work calendar' })
    ).toBeInTheDocument()
  })
})
