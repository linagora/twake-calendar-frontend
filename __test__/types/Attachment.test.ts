import { Attachment } from '@common/types/Attachment'

describe('Attachment', () => {
  describe('isDisplayable', () => {
    it('is displayable when a filename is present', () => {
      expect(
        new Attachment(
          'https://example.com/file',
          'application/pdf',
          'report.pdf'
        ).isDisplayable()
      ).toBe(true)
    })

    it('is not displayable without a filename', () => {
      expect(
        new Attachment('CID:664DD99135B2AF428B97493A660B458C@ugap.fr').isDisplayable()
      ).toBe(false)
    })

    it('is not displayable with an empty filename', () => {
      expect(
        new Attachment('https://example.com/file', undefined, '   ').isDisplayable()
      ).toBe(false)
    })
  })
})
