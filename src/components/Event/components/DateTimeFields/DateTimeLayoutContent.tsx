import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import { AllDayDateLayout } from './AllDayDateLayout'
import { CompactDateTimeLayout } from './CompactDateTimeLayout'
import { LayoutMode, LAYOUT_MODE } from './useDateTimeLayout'
import { ExpandedDateTimeLayout } from './ExpandedDateTimeLayout'

interface StartDateTime {
  startDateValue: Dayjs | null
  startTimeValue: Dayjs | null
  onStartDateChange: (v: PickerValue) => void
  onStartTimeChange: (v: PickerValue) => void
}

interface EndDateTime {
  endDateValue: Dayjs | null
  endTimeValue: Dayjs | null
  onEndDateChange: (v: PickerValue) => void
  onEndTimeChange: (v: PickerValue) => void
}

export interface DateTimeLayoutContentProps extends StartDateTime, EndDateTime {
  layoutMode: LayoutMode
  hasError: boolean
  isMobile: boolean
  allday: boolean
  startDateLabel: string
  shouldShowTimeFields: boolean
}

export function DateTimeLayoutContent({
  layoutMode,
  ...props
}: DateTimeLayoutContentProps): JSX.Element {
  if (layoutMode === LAYOUT_MODE.EXPANDED) {
    return <ExpandedDateTimeLayout {...props} />
  }
  if (layoutMode === LAYOUT_MODE.ALL_DAY) {
    return <AllDayDateLayout {...props} />
  }
  return <CompactDateTimeLayout {...props} />
}
