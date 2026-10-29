import { createAppSlice } from './createAppSlice'
import { PayloadAction } from '@reduxjs/toolkit'

export interface LoadingState {
  isLoading: boolean
  message?: string
}

const initialState: LoadingState = {
  isLoading: false,
  message: undefined
}

const LoadingSlice = createAppSlice({
  name: 'loading',
  initialState,
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
