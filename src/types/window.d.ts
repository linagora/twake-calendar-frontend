/**
 * Type-safe declarations for runtime configuration injected via
 * `public/env-config.js` (or `.env.example.js` during development).
 *
 * These globals are set on `window` before the React app boots so
 * that deployments can change configuration without rebuilding.
 *
 * @see https://github.com/linagora/twake-calendar-frontend/issues/477
 */

export {};

declare global {
  interface Window {
    // ── SSO / OpenID Connect ────────────────────────────────────
    /** Base URL of the OIDC provider (e.g. LemonLDAP) */
    SSO_BASE_URL?: string;
    /** OAuth2 client ID registered with the OIDC provider */
    SSO_CLIENT_ID?: string;
    /** Space-separated OIDC scopes */
    SSO_SCOPE?: string;
    /** Redirect URI after successful authentication */
    SSO_REDIRECT_URI?: string;
    /** OAuth2 response type (typically "code") */
    SSO_RESPONSE_TYPE?: string;
    /** PKCE code challenge method (typically "S256") */
    SSO_CODE_CHALLENGE_METHOD?: string;
    /** Redirect URI after logout */
    SSO_POST_LOGOUT_REDIRECT?: string;

    // ── Service URLs ────────────────────────────────────────────
    /** Calendar backend API base URL */
    CALENDAR_BASE_URL?: string;
    /** CalDAV server base URL */
    DAV_BASE_URL?: string;
    /** Twake Mail SPA URL (for cross-app navigation) */
    MAIL_SPA_URL?: string;
    /** Video conference base URL (e.g. Jitsi) */
    VIDEO_CONFERENCE_BASE_URL?: string;
    /** Support page URL */
    SUPPORT_URL?: string;
    /** WebSocket endpoint for real-time calendar updates */
    WEBSOCKET_URL?: string;

    // ── WebSocket tuning ────────────────────────────────────────
    /** Debounce period in ms for WebSocket calendar updates */
    WS_DEBOUNCE_PERIOD_MS?: number;
    /** Interval in ms between WebSocket ping frames */
    WS_PING_PERIOD_MS?: number;
    /** Timeout in ms to wait for a pong before considering the connection dead */
    WS_PING_TIMEOUT_PERIOD_MS?: number;

    // ── Misc ────────────────────────────────────────────────────
    /** Enable debug logging */
    DEBUG?: boolean;
    /** Default UI language (BCP 47 tag, e.g. "en", "fr") */
    LANG: string;
  }
}
