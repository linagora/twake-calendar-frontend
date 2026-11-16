import { isDriveAttachmentUrl } from '@common/features/Tdrive/helpers/driveUpload'

const fallback = '{localpart}.example.com'

it.each([
  'https://bob.example.com/public',
  'https://bob-drive.example.com/public',
  'https://bob.example.com/public/',
  'https://bob.example.com/public/file-id',
  'http://bob.example.com/public?sharecode=token'
])(
  'accepts a matching host and public path without requiring a sharecode: %s',
  uri => {
    expect(isDriveAttachmentUrl(uri, fallback)).toBe(true)
  }
)

it.each([
  'https://external.example.org/public',
  'https://bob.example.com.evil.org/public',
  'https://bob.other.example.com/public',
  'https://bobXexample.com/public',
  'https://bob.example.com:8443/public',
  'https://drive.bob.example.com/public',
  'https://bob.example.com/private',
  'https://bob.example.com/publicity',
  'https://bob.example.com/private?path=/public',
  'https://user:password@bob.example.com/public',
  'javascript:alert(1)',
  'CID:foo@bar',
  '/public?sharecode=secret'
])('rejects nonmatching hosts or non-public paths: %s', uri => {
  expect(isDriveAttachmentUrl(uri, fallback)).toBe(false)
})

it('rejects links when the fallback is not configured', () => {
  expect(
    isDriveAttachmentUrl('https://bob.example.com/public', undefined)
  ).toBe(false)
})

it('matches a literal hostname exactly without removing Drive prefixes', () => {
  expect(
    isDriveAttachmentUrl(
      'https://bob-drive.example.com/public',
      'bob-drive.example.com'
    )
  ).toBe(true)
  expect(
    isDriveAttachmentUrl(
      'https://bob-drive.example.com/public',
      'bob.example.com'
    )
  ).toBe(false)
})

it('supports a configured nested host template', () => {
  expect(
    isDriveAttachmentUrl(
      'https://drive.bob.example.com/public',
      'drive.{localpart}.example.com'
    )
  ).toBe(true)
})
