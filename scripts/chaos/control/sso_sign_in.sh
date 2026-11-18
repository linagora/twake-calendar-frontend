#!/bin/bash
# A user signs in: the SSO (Dex, which checks the password against the LDAP) gives a new access token, and the web app's
# first call with it, its profile (GET /api/user), is served. Never uses the cached session of the other scripts.
. "$(dirname "$0")/lib.sh"

token="$(sso_token "$CHAOS_USER" "$CHAOS_PASSWORD" 2>/dev/null)"
[ -n "$token" ] || fail "the SSO gives no token to $CHAOS_USER (password grant)"
out="$(api "$token" "$API/api/user")"
[ "$(status_of "$out")" = 200 ] || fail "a new SSO token is refused: GET /api/user HTTP $(status_of "$out")"
[ "$(body_of "$out" | jq -r '.preferredEmail // empty' 2>/dev/null)" = "$CHAOS_USER" ] \
  || fail "GET /api/user with a new token: not $CHAOS_USER's profile"
pass "$CHAOS_USER signed in through the SSO, profile served"
