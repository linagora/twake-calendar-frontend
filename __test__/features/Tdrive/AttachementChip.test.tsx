import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AttachementChip } from '@common/components/EventPreview/AttachementPreview/AttachementChip'
import { Attachment } from '@common/types/Attachment'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  sdk: vi.fn()
}))
vi.mock('cozy-interapp', () => ({
  default: vi.fn().mockImplementation(function () {
    return { create: mocks.create }
  })
}))
vi.mock('twake-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@common/app/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({ user: { tokens: { id_token: 'id-token' } } })
}))
vi.mock('@common/app/selectors/selectPlatformURL', () => ({
  selectPlatformURL: () => 'https://alice.other.example.org'
}))
vi.mock('@common/utils/sdkSession', () => ({ ensureSdkSignedIn: mocks.sdk }))
const attachment = new Attachment(
  'https://bob-drive.example.com/public?sharecode=token',
  'application/pdf',
  'report.pdf'
)

beforeEach(() => {
  vi.clearAllMocks()
  window.TDRIVE_ENABLED = true
  window.WORKPLACE_FQDN_FALLBACK = '{localpart}.example.com'
  mocks.sdk.mockResolvedValue({})
  mocks.create.mockImplementation(() =>
    Object.assign(Promise.resolve({}), {
      start: (...args: unknown[]) =>
        Object.assign(mocks.start(...args), { stop: mocks.stop })
    })
  )
  mocks.start.mockResolvedValue({ _id: 'saved-file' })
})
afterEach(() => {
  window.TDRIVE_ENABLED = false
  window.WORKPLACE_FQDN_FALLBACK = undefined
})

it('passes the original attachment URL to UPLOAD without fetching it in the browser', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  fireEvent.click(screen.getByRole('button', { name: 'tdrive.saveToDrive' }))
  expect(
    await screen.findByRole('status', { name: 'tdrive.saved' })
  ).toBeVisible()
  expect(mocks.create).toHaveBeenCalledWith('UPLOAD', 'io.cozy.files', {
    url: attachment.uri,
    folderId: 'io.cozy.files.root-dir',
    name: 'report.pdf'
  })
  expect(open).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
  fetch.mockRestore()
  open.mockRestore()
})

it('prevents repeated saves while uploading', async () => {
  let finish!: (value: unknown) => void
  mocks.start.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  const button = screen.getByRole('button', { name: 'tdrive.saveToDrive' })
  fireEvent.click(button)
  await waitFor(() => expect(button).toBeDisabled())
  expect(
    screen.getByRole('progressbar', { name: 'tdrive.saving' })
  ).toBeVisible()
  fireEvent.click(button)
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
  await act(async () => finish({ _id: 'file' }))
  expect(
    await screen.findByRole('status', { name: 'tdrive.saved' })
  ).toBeVisible()
})

it('reports failure without automatically retrying', async () => {
  mocks.start.mockRejectedValue(new Error('upload failed'))
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  fireEvent.click(screen.getByRole('button', { name: 'tdrive.saveToDrive' }))
  expect(await screen.findByText('tdrive.saveError')).toBeVisible()
  expect(mocks.create).toHaveBeenCalledTimes(1)
})

it('does not report success on intent cancellation', async () => {
  mocks.start.mockResolvedValue(null)
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  fireEvent.click(screen.getByRole('button', { name: 'tdrive.saveToDrive' }))
  await waitFor(() => expect(mocks.stop).toHaveBeenCalled())
  expect(
    screen.queryByRole('status', { name: 'tdrive.saved' })
  ).not.toBeInTheDocument()
  expect(screen.queryByText('tdrive.saveError')).not.toBeInTheDocument()
})

it.each([
  ['https://external.example.org/file.pdf', true],
  [attachment.uri, false]
])('hides the save action for %s with Drive enabled=%s', (uri, enabled) => {
  window.TDRIVE_ENABLED = enabled
  render(
    <AttachementChip
      isOrganizer={false}
      attachment={new Attachment(uri, 'application/pdf', 'report.pdf')}
    />
  )
  expect(
    screen.queryByRole('button', { name: 'tdrive.saveToDrive' })
  ).not.toBeInTheDocument()
})

it('stops an in-flight intent on unmount', async () => {
  mocks.start.mockImplementation(() => new Promise(() => {}))
  const { unmount } = render(
    <AttachementChip isOrganizer={false} attachment={attachment} />
  )
  fireEvent.click(screen.getByRole('button', { name: 'tdrive.saveToDrive' }))
  await waitFor(() => expect(mocks.start).toHaveBeenCalled())
  unmount()
  expect(mocks.stop).toHaveBeenCalled()
})

it('ends an unresponsive intent and reports an uncertain outcome', async () => {
  vi.useFakeTimers()
  try {
    mocks.start.mockImplementation(() => new Promise(() => {}))
    render(<AttachementChip isOrganizer={false} attachment={attachment} />)
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'tdrive.saveToDrive' })
      )
    })
    expect(mocks.start).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000)
    })
    expect(screen.getByText('tdrive.saveError')).toBeVisible()
    expect(mocks.stop).toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})

it.each([true, undefined])(
  'hides the save button when event ownership is %s',
  isOrganizer => {
    render(
      <AttachementChip attachment={attachment} isOrganizer={isOrganizer} />
    )
    expect(
      screen.queryByRole('button', { name: 'tdrive.saveToDrive' })
    ).not.toBeInTheDocument()
    expect(mocks.sdk).not.toHaveBeenCalled()
  }
)

it('hides the save button when editing attachments', () => {
  render(
    <AttachementChip
      attachment={attachment}
      isOrganizer={false}
      onDelete={vi.fn()}
    />
  )
  expect(
    screen.queryByRole('button', { name: 'tdrive.saveToDrive' })
  ).not.toBeInTheDocument()
})

it('renders the save button inside the Chip endIcon slot', () => {
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  const button = screen.getByRole('button', { name: 'tdrive.saveToDrive' })
  expect(button.closest('.MuiChip-label')).not.toBeNull()
  expect(button).toHaveAttribute('aria-label', 'tdrive.saveToDrive')
})

it('shows only the save tooltip when moving from the filename to the save button', async () => {
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  const label = screen.getByText('report')
  const button = screen.getByRole('button', { name: 'tdrive.saveToDrive' })
  fireEvent.mouseOver(label)
  expect(
    await screen.findByRole('tooltip', { name: 'report.pdf' })
  ).toBeVisible()

  fireEvent.mouseOut(label, { relatedTarget: button })
  fireEvent.mouseOver(button, { relatedTarget: label })
  expect(
    await screen.findByRole('tooltip', { name: 'tdrive.saveToDrive' })
  ).toBeVisible()
  await waitFor(() =>
    expect(
      screen.queryByRole('tooltip', { name: 'report.pdf' })
    ).not.toBeInTheDocument()
  )

  fireEvent.mouseOut(button, { relatedTarget: label })
  fireEvent.mouseOver(label, { relatedTarget: button })
  expect(
    await screen.findByRole('tooltip', { name: 'report.pdf' })
  ).toBeVisible()
})

it('keeps the inline saved state after the notification timeout and prevents another copy', async () => {
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  fireEvent.click(screen.getByRole('button', { name: 'tdrive.saveToDrive' }))
  const status = await screen.findByRole('status', { name: 'tdrive.saved' })
  expect(status).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'tdrive.saveToDrive' })
  ).not.toBeInTheDocument()
  vi.useFakeTimers()
  try {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(status).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(status)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})

it('hides the upload action when the attachment host does not match the fallback', () => {
  window.WORKPLACE_FQDN_FALLBACK = '{localpart}.trusted.example.org'
  render(<AttachementChip isOrganizer={false} attachment={attachment} />)
  expect(
    screen.queryByRole('button', { name: 'tdrive.saveToDrive' })
  ).not.toBeInTheDocument()
})
