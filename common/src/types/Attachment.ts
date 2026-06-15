import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'

export class Attachment {
  constructor(
    public uri: string,
    public fmttype?: string,
    public x_filename?: string
  ) {}

  asJcal(): VObjectProperty {
    const params: Record<string, string> = {}
    if (this.fmttype) params['fmttype'] = this.fmttype
    if (this.x_filename) params['x-filename'] = this.x_filename
    return ['attach', params, 'uri', this.uri]
  }
}
