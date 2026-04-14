import { useMediaQuery } from '@linagora/twake-mui'
import { PickerValue } from '@mui/x-date-pickers/internals'
import { Dayjs } from 'dayjs'
import { DesktopDatePickerField } from './DesktopDatePickerField'
import { TouchDatePickerField } from './TouchDatePickerField'

export interface DatePickerFieldProps {
  value: Dayjs | null
  onChange: (value: PickerValue) => void
  testId: string
  label: string
  hasError?: boolean
}

export const DatePickerField: React.FC<DatePickerFieldProps> = props => {
  const isTouch = useMediaQuery('(pointer: coarse)')
  return isTouch ? (
    <TouchDatePickerField {...props} />
  ) : (
    <DesktopDatePickerField {...props} />
  )
}
