// Runtime configuration of the SPA under e2e test.
//
// Every URL below is resolved by the test browser through Chromium's
// --host-resolver-rules (see TwakeCalendarStack), so the browser and the containers agree
// on one single set of URLs whatever ports docker picked.
//
// The SPA itself is served as http://localhost:8099 -- a made up port, nothing is bound on
// the host -- because the OIDC PKCE challenge goes through crypto.subtle, which the browser
// only exposes in a secure context. `localhost` is trustworthy, `frontend` would not be.
var SSO_BASE_URL = 'https://sso:5554'
var SSO_CLIENT_ID = 'twake-calendar'
var SSO_SCOPE = 'openid profile email'
var SSO_REDIRECT_URI = 'http://localhost:8099/callback'
var SSO_RESPONSE_TYPE = 'code'
var SSO_CODE_CHALLENGE_METHOD = 'S256'
var SSO_POST_LOGOUT_REDIRECT = 'http://localhost:8099?logout=1'

var CALENDAR_BASE_URL = 'http://api'
var DAV_BASE_URL = 'http://dav'
var WEBSOCKET_URL = 'ws://api'

var MAIL_SPA_URL = 'http://mail.e2e.local'
var CHAT_SPA_URL = 'http://chat.e2e.local'
var VIDEO_CONFERENCE_BASE_URL = 'http://meet.e2e.local'
var SUPPORT_URL = 'http://support.e2e.local'
var PRIVACY_URL = 'http://privacy.e2e.local'
var TERMS_URL = 'http://terms.e2e.local'
var LANDING_PAGE_URL = 'http://landing.e2e.local'

// DEBUG=true also disables the nginx asset cache in the app image, which keeps
// re-runs against a rebuilt bundle honest.
var DEBUG = true
var LANG = 'en'

var WS_DEBOUNCE_PERIOD_MS = 0
var WS_PING_PERIOD_MS = 30000
var WS_PING_TIMEOUT_PERIOD_MS = 35000

var DISABLE_PUBLIC_VISIBILITY = false
// No timezone prompt: it would steal the focus from the tests
var ASK_FOR_TZ_UPDATE = false
var TOOLTIP_DELAY_MS = 0
var HIDE_LANGUAGE_SELECTOR = false
var BOOKING_LINK_ENABLED = true
var ENABLE_EVENT_ATTACHMENTS = false
var ENABLE_REFRESH_BUTTON = true
var TDRIVE_ENABLED = false
var ENABLE_ATTACHMENT_UPLOAD = false
var ENABLE_CREATE_BOOKING = true
// Where the private app points a booking link. The public SPA answers on that hostname,
// remapped like every other one by the browser's resolver rules.
var PUBLIC_PAGE_BASE = 'http://public'
