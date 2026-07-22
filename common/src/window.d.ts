import type { AppIconProps } from '@common/components/Menubar/Menubar'
import type { MutableRefObject } from 'react'
import type { CalendarApi } from '@fullcalendar/core'

export {}

declare global {
  interface Window {
    SSO_BASE_URL: string
    SSO_CLIENT_ID: string
    SSO_SCOPE: string
    SSO_REDIRECT_URI: string
    SSO_RESPONSE_TYPE: 'code'
    SSO_CODE_CHALLENGE_METHOD: 'S256'
    SSO_POST_LOGOUT_REDIRECT: string

    CALENDAR_BASE_URL: string
    DAV_BASE_URL: string
    CALDAV_PREFER_HANDLING?: 'strict'
    MAIL_SPA_URL: string
    VIDEO_CONFERENCE_BASE_URL: string
    SUPPORT_URL: string
    PRIVACY_URL: string
    TERMS_URL: string
    LANDING_PAGE_URL: string

    SENTRY_DSN: string | undefined

    APP_VERSION: string

    DEBUG: boolean
    LANG: string

    WEBSOCKET_URL: string
    WS_DEBOUNCE_PERIOD_MS: number
    WS_SKIP_DELAY_MS: number
    WS_PING_PERIOD_MS: number
    WS_PING_TIMEOUT_PERIOD_MS: number

    HIDE_RESOURCES: boolean | undefined

    appList: AppIconProps[]

    __calendarRef?: MutableRefObject<CalendarApi | null>

    DISABLE_PUBLIC_VISIBILITY: boolean

    ENABLE_CREATE_BOOKING: boolean

    BOOKING_LINK_ENABLED: boolean | undefined

    ENABLE_EVENT_ATTACHMENTS: boolean | undefined

    ASK_FOR_TZ_UPDATE: boolean

    TOOLTIP_DELAY_MS: number

    displayOrgAvatar: boolean

    __ws?: WebSocket

    HIDE_LANGUAGE_SELECTOR: boolean

    PUBLIC_PAGE_BASE: string | undefined
  }
}
