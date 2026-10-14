import { render, screen } from '@testing-library/react'
import React from 'react'

import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('has no size class without a size, so sx sizes it', () => {
    render(<Avatar data-testid="avatar">TP</Avatar>)
    expect(screen.getByTestId('avatar').className).not.toMatch(/size-/)
  })

  it('keeps the size class of a twake-mui size', () => {
    render(
      <Avatar data-testid="avatar" size="s">
        TP
      </Avatar>
    )
    expect(screen.getByTestId('avatar')).toHaveClass('size-s')
  })

  it('ignores a colour that is not a twake-mui one', () => {
    render(
      <Avatar data-testid="avatar" color="linear-gradient(red, blue)">
        TP
      </Avatar>
    )
    expect(screen.getByTestId('avatar')).not.toHaveStyle({
      background: 'linear-gradient(red, blue)'
    })
  })
})
