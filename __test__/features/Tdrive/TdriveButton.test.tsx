/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { TdriveButton } from '@common/features/Tdrive/components/TdriveButton'
import * as tdriveUrlUtils from '@common/utils/tdriveUrlUtils'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

jest.mock('@common/features/Tdrive/components/TdrivePickerDialog', () => ({
  TdrivePickerDialog: () =>
    React.createElement('div', { 'data-testid': 'tdrive-dialog' }, 'Dialog')
}))

jest.mock('@common/utils/tdriveUrlUtils')

describe('TdriveButton', () => {
  const mockOnFileSelected = jest.fn()
  const mockIsTdriveEnabled = jest.spyOn(tdriveUrlUtils, 'isTdriveEnabled')

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store: setupStore() }, children)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when Tdrive is not enabled', () => {
    mockIsTdriveEnabled.mockReturnValue(false)

    const { container } = render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders short mode button when showMore is false', () => {
    mockIsTdriveEnabled.mockReturnValue(true)

    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('event.form.addTdriveFile')).toBeInTheDocument()
  })

  it('renders expanded mode button when showMore is true', () => {
    mockIsTdriveEnabled.mockReturnValue(true)

    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByRole('button')).toHaveTextContent(
      'event.form.addTdriveFile'
    )
  })

  it('shows label in expanded mode', () => {
    mockIsTdriveEnabled.mockReturnValue(true)

    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: true
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('event.form.tdriveFiles')).toBeInTheDocument()
  })

  it('does not show label in short mode', () => {
    mockIsTdriveEnabled.mockReturnValue(true)

    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )

    expect(screen.queryByText('event.form.tdriveFiles')).not.toBeInTheDocument()
  })

  it('renders TdrivePickerDialog', () => {
    mockIsTdriveEnabled.mockReturnValue(true)

    render(
      React.createElement(TdriveButton, {
        onFileSelected: mockOnFileSelected,
        showMore: false
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByTestId('tdrive-dialog')).toBeInTheDocument()
  })
})
