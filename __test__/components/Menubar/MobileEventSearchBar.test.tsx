import MobileSearchBar from '@common/components/Menubar/MobileEventSearchBar'
import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@common/features/User/UserDao')

const preloadedState = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'mockSid',
      openpaasId: 'user1'
    },
    tokens: { accessToken: 'token' }
  }
}

describe('MobileEventSearchBar', () => {
  it('keeps the Clear button on the same line as the typed text', () => {
    renderWithProviders(<MobileSearchBar />, preloadedState)

    const input = screen.getByPlaceholderText('common.search')
    expect(input).toHaveClass('MuiAutocomplete-input')
    userEvent.type(input, 'batch')

    const clearButton = screen.getByRole('button', { name: 'common.clear' })
    const inputRoot = input.closest('.MuiAutocomplete-inputRoot')
    expect(inputRoot).toContainElement(clearButton)
    expect(inputRoot).toHaveStyle({ flexWrap: 'nowrap' })
  })
})
