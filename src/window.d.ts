import type { AppIconProps } from "@/components/Menubar/Menubar";
import type { MutableRefObject } from "react";
import type { CalendarApi } from "@fullcalendar/core";

export {};

declare global {
  interface Window {
    SSO_BASE_URL: string;
    SSO_CLIENT_ID: string;
    SSO_SCOPE: string;
    SSO_REDIRECT_URI: string;
    SSO_RESPONSE_TYPE: "code";
    SSO_CODE_CHALLENGE_METHOD: "S256";
    SSO_POST_LOGOUT_REDIRECT: string;

    CALENDAR_BASE_URL: string;
    MAIL_SPA_URL: string;
    VIDEO_CONFERENCE_BASE_URL: string;

    DEBUG: boolean;
    LANG: string;

    WEBSOCKET_URL: string;
    WS_DEBOUNCE_PERIOD_MS: number;
    WS_PING_PERIOD_MS: number;
    WS_PING_TIMEOUT_PERIOD_MS: number;

    appList: AppIconProps[];

    __calendarRef: MutableRefObject<CalendarApi | null>;
  }
}
