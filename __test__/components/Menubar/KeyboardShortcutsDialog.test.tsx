import { useState } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { KeyboardShortcutsDialog } from '@common/components/Menubar/KeyboardShortcutsDialog'
import { renderWithProviders } from '../../utils/Renderwithproviders'

function Harness(): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Shortcuts</button>
      <KeyboardShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

it('lists the shortcuts and restores focus when Escape closes the dialog', async () => {
  renderWithProviders(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Shortcuts' })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'shortcuts.title' })
  expect(screen.getAllByRole('row')).toHaveLength(10)
  expect(screen.getByText('menubar.views.schedule')).toBeInTheDocument()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(trigger).toHaveFocus()
})
