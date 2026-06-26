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
var MAIL_SPA_URL = 'https://mail.example.com'
// VIDEO_CONFERENCE_BASE_URL is a URI template (RFC 6570 style).
// Supported expressions: {localpart}, {workplaceFqdn},
// {workplaceFqdn.localpart}, {workplaceFqdn.domain}
// Examples:
//   'https://visio-{workplaceFqdn}/#/bridge'
//   'https://visio-{localpart}.twake.app/#/bridge'
//   'https://{workplaceFqdn.localpart}-visio.{workplaceFqdn.domain}/#/bridge'
var VIDEO_CONFERENCE_BASE_URL = 'https://meet.linagora.com'
var SUPPORT_URL = 'https://twake.app/support/'
var PRIVACY_URL = 'https://twake.app/privacy'
var TERMS_URL = 'https://twake.app/terms'
var LANDING_PAGE_URL = 'https://twake.app'
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
