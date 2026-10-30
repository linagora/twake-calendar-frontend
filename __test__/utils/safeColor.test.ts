import { isSafeColor } from '@common/utils/safeColor'

describe('isSafeColor', () => {
  it.each(['#fff', '#FFFA', '#a1b2c3', '#A1B2C3D4'])('accepts %s', color => {
    expect(isSafeColor(color)).toBe(true)
  })

  it.each([
    'red',
    'rgb(1,2,3)',
    '#fff;}*{background:url(https://evil.example/x)}',
    '#12345',
    '#ggg',
    '',
    undefined,
    null,
    42
  ])('refuses %j', color => {
    expect(isSafeColor(color)).toBe(false)
  })
})
