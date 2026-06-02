import { createAppSlice } from './createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'

export interface LoadingState {
  isLoading: boolean
  message?: string
}

const LoadingSlice = createAppSlice({
  name: 'loading',
  initialState: {
    isLoading: false,
    message: undefined
  } as LoadingState,
  reducers: create => ({
    setAppLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (!action.payload) {
        state.message = undefined
      }
    }),
    setLoadingMessage: create.reducer(
      (state, action: PayloadAction<string | undefined>) => {
        state.message = action.payload
      }
    )
  })
})

export const { setAppLoading, setLoadingMessage } = LoadingSlice.actions
export default LoadingSlice.reducer
