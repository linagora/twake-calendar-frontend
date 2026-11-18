#!/bin/bash
# A signed-in user manages a contact of their address book (CardDAV through the side service's DAV proxy, jCard as the
# OpenPaaS clients send it): lists their address books, creates a contact, reads it back, deletes it.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
out="$(api "$U_TOKEN" -H 'Accept: application/vcard+json' "$API/dav/addressbooks/$U_ID.json?personal=true")"
[ "$(status_of "$out")" = 200 ] || fail "address books not listed (HTTP $(status_of "$out"))"
body_of "$out" | jq -e --arg h "/addressbooks/$U_ID/contacts.json" '._embedded["dav:addressbook"] | map(._links.self.href) | index($h)' >/dev/null 2>&1 \
  || fail "the address book list lacks the contacts address book"

uid="chaos-contact-$(rand)"
url="$API/dav/addressbooks/$U_ID/contacts/$uid.vcf"
trap 'delete_quietly "$U_TOKEN" "$url"' EXIT
card="$(jq -cn --arg u "$uid" '["vcard", [["version", {}, "text", "4.0"], ["uid", {}, "text", $u], ["fn", {}, "text", ("Chaos " + $u)], ["email", {}, "text", ($u + "@example.org")]]]')"
code="$(api "$U_TOKEN" -X PUT -H 'Content-Type: application/vcard+json' -d "$card" "$url" | tail -n 1)"
[ "$code" = 201 ] || fail "contact not created (PUT: HTTP $code)"
out="$(api "$U_TOKEN" -H 'Accept: application/vcard+json' "$url")"
[ "$(status_of "$out")" = 200 ] && grep -q "Chaos $uid" <<<"$(body_of "$out")" || fail "the contact is not read back (GET: HTTP $(status_of "$out"))"
code="$(api "$U_TOKEN" -X DELETE "$url" | tail -n 1)"
[ "$code" = 204 ] || fail "contact not deleted (DELETE: HTTP $code)"
trap - EXIT
pass "contact created, read and deleted"
