import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { Auth } from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { redirectTo } from '@common/utils/apiUtils'
import { useEffect, useRef } from 'react'
import { getCalendarsList } from '../Calendars/CalendarSlice'

export function useInitializeApp() {
  const userData = useAppSelector(state => state.user)
  const calendars = useAppSelector(state => state.calendars)
  const dispatch = useAppDispatch()
  const hasInitiatedRef = useRef(false)

  useEffect(() => {
    if (hasInitiatedRef.current) return
    if (userData.userData && !calendars.pending) return
    if (window.location.pathname === '/callback') return
    hasInitiatedRef.current = true

    const initiateLogin = async () => {
      const savedToken = sessionStorage.getItem('tokenSet')
        ? JSON.parse(sessionStorage.getItem('tokenSet') ?? '{}')
        : null
      const savedUser = sessionStorage.getItem('userData')
        ? JSON.parse(sessionStorage.getItem('userData') ?? '{}')
        : null

      if (savedToken && savedUser) {
        dispatch(setAppLoading(true))
        dispatch(setTokens(savedToken))
        dispatch(setUserData(savedUser))
        try {
          await dispatch(getOpenPaasUserData())
          await dispatch(getCalendarsList())
        } finally {
          dispatch(setAppLoading(false))
        }

        return
      }

      const loginurl = await Auth()
      sessionStorage.setItem(
        'redirectState',
        JSON.stringify({
          code_verifier: loginurl.code_verifier,
          state: loginurl.state
        })
      )
      redirectTo(loginurl.redirectTo)
    }

    initiateLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.userData])
}
