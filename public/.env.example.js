var SSO_BASE_URL = 'https://example.com'
var SSO_CLIENT_ID = 'example'
var SSO_SCOPE = 'openid profile email'
var SSO_REDIRECT_URI = 'https://example.com/callback'
var SSO_RESPONSE_TYPE = 'code'
var SSO_CODE_CHALLENGE_METHOD = 'S256'
var SSO_POST_LOGOUT_REDIRECT = 'http://example.com?logout=1'
var CALENDAR_BASE_URL = 'https://calendar.example.com'
var DAV_BASE_URL = 'https://dav.example.com'
var CALDAV_PREFER_HANDLING = 'strict'
// MAIL_SPA_URL is a URI template (RFC 6570 style).
// Supported expressions: {localpart}, {workplaceFqdn},
// {workplaceFqdn.localpart}, {workplaceFqdn.domain}
// Examples:
//   'https://mail-{workplaceFqdn}'
//   'https://{workplaceFqdn.localpart}-mail.{workplaceFqdn.domain}'
var MAIL_SPA_URL = 'https://mail.example.com'
// VIDEO_CONFERENCE_BASE_URL is a URI template (RFC 6570 style).
// Supported expressions: {localpart}, {workplaceFqdn},
// {workplaceFqdn.localpart}, {workplaceFqdn.domain}
// Examples:
//   'https://visio-{workplaceFqdn}/#/bridge'
//   'https://visio-{localpart}.twake.app/#/bridge'
//   'https://{workplaceFqdn.localpart}-visio.{workplaceFqdn.domain}/#/bridge'
var VIDEO_CONFERENCE_BASE_URL = 'https://meet.linagora.com'
// Asks the side service (POST /api/videoconference) to create the Meet room
// instead of appending a random code to VIDEO_CONFERENCE_BASE_URL, which stays
// required: it enables the video conference field and serves as the fallback
// when the side service has no Meet integration. Defaults to false.
var MEET_BACKEND_INTEGRATION = false
var SUPPORT_URL = 'https://twake.app/support/'
var PRIVACY_URL = 'https://twake.app/privacy'
var TERMS_URL = 'https://twake.app/terms'
var LANDING_PAGE_URL = 'https://twake.app'
// Keep DEBUG=false in production: CTRL + SHIFT + ALT + D turns debug mode on
// for the current tab when diagnosing an issue, and off again on a second hit.
// DEBUG=true also exposes the application state to Redux DevTools.
var DEBUG = false
var LANG = 'en'
var WEBSOCKET_URL = 'wss://calendar.example.com'
var WS_DEBOUNCE_PERIOD_MS = 100 // milliseconds, remove or set to 0 to disable debounce
var WS_PING_PERIOD_MS = 30000
var WS_PING_TIMEOUT_PERIOD_MS = 35000
// var SENTRY_DSN = "https://...@sentry.io/..."; // optional, omit to disable Sentry
// var HIDE_RESOURCES = true; // optional
var DISABLE_PUBLIC_VISIBILITY = false
var ASK_FOR_TZ_UPDATE = true
var TOOLTIP_DELAY_MS = 2000
var HIDE_LANGUAGE_SELECTOR = false
// Exposes the booking link section in the left bar. Defaults to false.
var BOOKING_LINK_ENABLED = false
// Displays the attachments section in the event display modal. Defaults to false.
var ENABLE_EVENT_ATTACHMENTS = false
// CHAT_SPA_URL is a URI template (RFC 6570 style).
// Supported expressions: {localpart},
// {workplaceFqdn.localpart}, {workplaceFqdn.domain}
// Examples:
//   'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/bridge/web/#/chat/@{target}:{workplaceFqdn.domain}'
//   'https://{localpart}-chat.twake.linagora.com/#/bridge/web/#/chat/@{target}:linagora.com'
var CHAT_SPA_URL = 'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/bridge/web/#/chat/@{target}:{workplaceFqdn.domain}'
// Fallback used when the OIDC provider does not expose a workplace FQDN.
// Supported expressions: {localpart}
// Examples:
//   '{localpart}.twake.linagora.com'
// var WORKPLACE_FQDN_FALLBACK = '{localpart}.twake.linagora.com'; // optional
var TDRIVE_ENABLED = false
var TDRIVE_INTENT_URL = "https://{localpart}.example.com"
// TDRIVE_INTENT_URL is a URI template (RFC 6570 style).
// Supported expressions: {localpart}, {workplaceFqdn},
// {workplaceFqdn.localpart}, {workplaceFqdn.domain}
// Examples:
//   'https://{workplaceFqdn}'
//   'https://{workplaceFqdn.localpart}.{workplaceFqdn.domain}'
var ENABLE_REFRESH_BUTTON = false 
