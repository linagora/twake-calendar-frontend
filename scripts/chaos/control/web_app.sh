#!/bin/bash
# The web apps load: the private SPA (the calendar) and the public SPA (booking pages, answers from mails) serve their
# page, their runtime configuration (.env.js) and every script the page loads.
. "$(dirname "$0")/lib.sh"

check_spa() {  # check_spa <name> <base url>
  local name="$1" base="$2" page scripts s code
  page="$(curl -s --max-time "$HTTP_TIMEOUT" -w '\n%{http_code}' "$base/")"
  [ "$(status_of "$page")" = 200 ] || fail "the $name SPA's page is not served (HTTP $(status_of "$page"))"
  scripts="$(body_of "$page" | grep -o -E 'src="/[^"]+\.js"' | sed -n 's/^src="\(.*\)"$/\1/p')"
  grep -q '^/static/js/index\.' <<<"$scripts" || fail "the $name SPA's page loads no application bundle"
  for s in $scripts; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time "$HTTP_TIMEOUT" "$base$s")"
    [ "$code" = 200 ] || fail "the $name SPA's script $s is not served (HTTP $code)"
  done
}

check_spa private "$CHAOS_WEB_URL"
check_spa public "$CHAOS_PUBLIC_URL"
pass "the private and public SPAs load"
