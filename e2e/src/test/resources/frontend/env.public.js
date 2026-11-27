// Runtime configuration of the *public* SPA under e2e test.
//
// The public app serves the pages a guest reaches without an account: a booking link, the
// preview of an event they were invited to, the confirmation of a booking they just made.
// It never authenticates, so there is no OIDC block here and no secure context to preserve:
// a plain `http://public` origin is enough, remapped by the browser resolver rules like
// every other hostname of the stack.
var CALENDAR_BASE_URL = 'http://api'
var DAV_BASE_URL = 'http://dav'
var WEBSOCKET_URL = 'ws://api'

var PUBLIC_PAGE_BASE = 'http://public'

var SUPPORT_URL = 'http://support.e2e.local'
var PRIVACY_URL = 'http://privacy.e2e.local'
var TERMS_URL = 'http://terms.e2e.local'
var LANDING_PAGE_URL = 'http://landing.e2e.local'

var DEBUG = true
var LANG = 'en'
var HIDE_LANGUAGE_SELECTOR = false
var BOOKING_LINK_ENABLED = true
var ENABLE_CREATE_BOOKING = true
