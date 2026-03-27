/**
 * Type declarations for runtime configuration injected via
 * `public/env-config.js` before the React app boots.
 *
 * Deployments can change configuration without rebuilding —
 * all values are set on `window` at load time.
 *
 * @see public/.env.example.js for defaults and documentation
 * @see https://github.com/linagora/twake-calendar-frontend/issues/477
 */
import type { AppIconProps } from "@/components/Menubar/Menubar";
import type { MutableRefObject } from "react";
import type { CalendarApi } from "@fullcalendar/core";

export {};

declare global {
  interface Window {
    // ── SSO / OpenID Connect ────────────────────────────────────
    /** Base URL of the OIDC provider (e.g. LemonLDAP) */
    SSO_BASE_URL: string;
    /** OAuth2 client ID registered with the OIDC provider */
    SSO_CLIENT_ID: string;
    /** Space-separated OIDC scopes (e.g. "openid profile email") */
    SSO_SCOPE: string;
    /** Redirect URI after successful authentication */
    SSO_REDIRECT_URI: string;
    /** OAuth2 response type */
    SSO_RESPONSE_TYPE: "code";
    /** PKCE code challenge method */
    SSO_CODE_CHALLENGE_METHOD: "S256";
    /** Redirect URI after logout */
    SSO_POST_LOGOUT_REDIRECT: string;

    // ── Service URLs ────────────────────────────────────────────
    /** Calendar backend API base URL */
    CALENDAR_BASE_URL: string;
    /** CalDAV server base URL */
    DAV_BASE_URL: string;
    /** Twake Mail SPA URL (for cross-app navigation) */
    MAIL_SPA_URL: string;
    /** Video conference base URL (e.g. Jitsi) */
    VIDEO_CONFERENCE_BASE_URL: string;
    /** Support page URL */
    SUPPORT_URL: string;

    // ── Misc ────────────────────────────────────────────────────
    /** Enable debug logging */
    DEBUG: boolean;
    /** Default UI language (BCP 47, e.g. "en", "fr") */
    LANG: string;

    // ── WebSocket tuning ────────────────────────────────────────
    /** WebSocket endpoint for real-time calendar updates */
    WEBSOCKET_URL: string;
    /** Debounce period in ms for WebSocket calendar updates (0 = disabled) */
    WS_DEBOUNCE_PERIOD_MS: number;
    /** Interval in ms between WebSocket ping frames */
    WS_PING_PERIOD_MS: number;
    /** Timeout in ms to wait for a pong before reconnecting */
    WS_PING_TIMEOUT_PERIOD_MS: number;

    // ── App state ───────────────────────────────────────────────
    /** Sidebar application list */
    appList: AppIconProps[];
    /** Ref to the FullCalendar API instance (set by CalendarView) */
    __calendarRef: MutableRefObject<CalendarApi | null>;
  }
}
