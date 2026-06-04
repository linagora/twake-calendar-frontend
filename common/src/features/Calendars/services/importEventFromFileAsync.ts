import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import { importEvent } from '@common/features/Events/EventDao'
import { importFile } from '@common/utils/apiUtils'
import { formatReduxError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const importEventFromFileThunk = (
  create: ReducerCreators<CalendarState>
) =>
  create.asyncThunk<
    void,
    { calLink: string; file: File },
    { rejectValue: RejectedError }
  >(
    async ({ calLink, file }, { rejectWithValue }) => {
      try {
        const response = (await importFile(file)) as { _id?: string }
        const id = response?._id
        if (!id) {
          return rejectWithValue({
            message: 'Failed to upload file: missing file ID',
            status: undefined
          })
        }
        await importEvent(id, calLink)
      } catch (err: unknown) {
        const error = err as {
          response?: { status?: number }
          message?: string
        }
        return rejectWithValue({
          message: formatReduxError(err),
          status: error.response?.status
        })
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: state => {
        state.pending = false
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to import event from file'
      }
    }
  )
