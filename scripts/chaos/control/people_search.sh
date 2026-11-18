#!/bin/bash
# A signed-in user types a name in the attendee field: the autocomplete (POST /api/people/search with the web app's
# object types, user and contact: the side service searches the contacts indexed in OpenSearch and resolves them to users)
# proposes the other user of the domain.
#
# Fixture: in a deployment the domain's members reach the contact indexes (domain_contact, user_contact) from Twake Mail
# or the directory; nothing feeds them on this stack (the side service has no LDAP configured, no Twake Mail). The domain
# contact of $CHAOS_USER2 is indexed once (a fixed id: idempotent) where it is missing, directly in OpenSearch.
. "$(dirname "$0")/lib.sh"

FIXTURE_ID=twake-chaos-user2
seed_fixture() {
  local node code doc
  doc="$(jq -cn --arg e "$CHAOS_USER2" --arg d "$CHAOS_DOMAIN" \
    '{contactId: "7c0f4f4e-6c1b-4f0e-9a51-6f8b6f2c0b0b", domain: $d, email: $e, firstname: ($e | split("@")[0]), surname: ($e | split("@")[0])}')"
  for node in opensearch1 opensearch2 opensearch3; do
    code="$(docker exec "$CHAOS_PROJECT-$node-1" curl -s -m 5 -o /dev/null -w '%{http_code}' \
      "localhost:9200/domain_contact/_doc/$FIXTURE_ID" 2>/dev/null)"
    case "$code" in
      200) return 0 ;;
      404) docker exec "$CHAOS_PROJECT-$node-1" curl -s -m 10 -o /dev/null -X PUT -H 'Content-Type: application/json' \
             "localhost:9200/domain_contact/_doc/$FIXTURE_ID?refresh=true" -d "$doc" 2>/dev/null; return 0 ;;
    esac
  done
  return 0  # OpenSearch unreachable: the search below tells
}

seed_fixture
signed_in "$CHAOS_USER" U
other="${CHAOS_USER2%@*}"
out="$(api "$U_TOKEN" -X POST -H 'Content-Type: application/json' \
  -d "{\"q\":\"$other\",\"objectTypes\":[\"user\",\"contact\"],\"limit\":10}" "$API/api/people/search")"
[ "$(status_of "$out")" = 200 ] || fail "people search not served (HTTP $(status_of "$out"))"
body_of "$out" | jq -e --arg e "$CHAOS_USER2" '[.[] | .emailAddresses[]?.value] | index($e)' >/dev/null 2>&1 \
  || fail "people search for '$other' does not propose $CHAOS_USER2"
pass "people search proposes $CHAOS_USER2"
