# Control scripts of Twake Calendar: what the runs showed

Runs of 2026-11-18 on the chaos stack (`tcalendar-chaos`), the web app at b595f9a399f4, the side service
`linagora/twake-calendar-side-service:2.5.0.5`, esn-sabre `linagora/esn-sabre:branch-master`.

Healthy stack: the 13 scripts exit 0 three runs in a row, each in 0.1 to 1.4 s. While a backend hangs, a request
gives up after 15 s (`HTTP_TIMEOUT`, lib.sh) and an async feature after 45 s (`ASYNC_WAIT`).

## Each component down (all its nodes `docker stop`ped)

| Component | Failing | Claimed (`impacts`) | Matches |
|---|---|---|---|
| mongodb | everything but `web_app` (static SPAs) | all | yes |
| opensearch | `people_search`, `event_search` | the same | yes |
| rabbitMQ | `event_search`, `invitation_email`, `invitation_delivery`, `alarm_scheduled`, `realtime` | the same | yes |
| redis | **every signed-in feature**: `sso_sign_in`, `calendars`, `events`, `contacts`, `people_search`, `event_search`, `invitation_email`, `invitation_delivery`, `alarm_scheduled`, `realtime`, `booking_link` | `realtime` | **no** |
| ldap | `sso_sign_in`, `caldav_basic_auth` | the same | yes |
| smtp | `invitation_email` | the same | yes |

Every component came back live (the features passed again, the app not restarted), **except Redis** (see below).
Once SMTP was back, `POST /unsentMails?action=resend` resent the 5 retained mails (`sentCount: 5, failedCount: 0`),
and the UnsentMails healthcheck went from `degraded` back to healthy, as claimed.

## Redis: the claim does not hold (repo: linagora/twake-calendar-side-service)

1. **Redis down: no signed-in request is answered.** Every REST call with an OIDC bearer token, the DAV proxy
   included (`GET /api/user` to begin with), hangs: no answer after 90 s. The same `GET /api/user` with the admin's
   Basic credentials answers in 6 ms, and so does a public booking route. The claim says tokens are then checked with
   the identity server on every request (no cache). Instead, the request waits on the Redis token cache with no timeout
   and no fallback. With Redis down the web app is unusable, not only its realtime. Still working: `web_app`, and
   `caldav_basic_auth` (esn-sabre directly). The side service's Redis healthcheck: `UNHEALTHY: Redis : Did not observe
   any item or terminal signal within 60000ms`.
2. **Redis back: some of it stays broken until the side service restarts (accidentRecovery `live` does not hold).**
   The 3 nodes restarted with their IPs swapped (redis2's old IP went to redis3). The side service then failed every
   event-bus publish to slot 7752 with `RedisCommandExecutionException: MOVED 7752 redis2:6379`
   (`CalendarRedisEventBus - Error while dispatching event`). So `POST /api/booking-links` answered 500 for more than
   5 minutes, through 11 attempts (its booking-link-changed notification goes through that bus). The Redis client
   keeps its old IP to node map and neither refreshes it nor follows the redirection. The `MOVED` errors outlived the
   cluster's own repair (point 3). `docker restart` of the side service fixed it right away. `realtime` (other slots)
   recovered by itself about 50 s after Redis was back. Kept as found: twake-chaos reports it.
3. **The stack (not the product): the `healthy` check of redis passed while the cluster was split.** After that
   restart, redis1 and redis3 each listed the other's nodes as `noaddr, disconnected` with slots
   (`617519… :0@0,redis3 master,noaddr … disconnected 10923-16383`). Every node still said `cluster_state:ok`, so
   `redis_healthy` (common.sh) succeeded. To leave the stack healthy I repaired it by hand:
   `CLUSTER MEET <ip> <port>` from each node to each other node's current IP, after which no node showed `noaddr`.
   The stack could have the nodes announce their hostnames (`cluster-announce-hostname`,
   `cluster-preferred-endpoint-type hostname`), so an IP change no longer splits the cluster. Its `healthy` check could
   also fail on any `noaddr` / `fail` line of `CLUSTER NODES`. (repo: linagora/twake-calendar-frontend, the stack)

## What the scripts cannot check on this stack

- **The reminder mail.** The side service runs its alarm scheduler in its default mode, `disabled`
  (`alarm.event.scheduler.mode` is absent from `conf/side-service/configuration.properties`; log at start:
  `Alarm event scheduler is disabled`). No reminder mail is ever sent. `alarm_scheduled` checks what the rabbitMQ claim
  names, "no alarm scheduled": the reminder is stored with its recipient and due time in `twake_calendar_alarm_events`,
  read with `docker exec … mongosh`. The smtp claim's "no mail sent (… alarms …)" is therefore not checked. Setting
  `alarm.event.scheduler.mode=cluster` in the stack would allow an `alarm_email` feature (the scheduler polls every
  60 s: up to about 90 s per run). (repo: linagora/twake-calendar-frontend, the stack)
- **The domain members synchronisation** (ldap claim). The side service has no LDAP configured on this stack: no
  `usersrepository.xml`, and `POST /addressbook/domain-members/{domain}?task=sync` answers 404. For the same reason,
  user Basic authentication to the side service's REST API is refused (401, only its admin account is accepted);
  `caldav_basic_auth` checks Basic against esn-sabre, as native CalDAV clients use it.
- **"The UnsentMails healthcheck is degraded"** (smtp claim) is an administrator's view, not a feature that stops.
  Seen degraded while SMTP was down, as claimed. No script checks it.

## Fixtures and probe details

- **People search** (`people_search`). The web app searches `objectTypes: ["user", "contact"]`, which makes the side
  service search only its OpenSearch contact indexes (`user_contact`, `domain_contact`); with that body the user
  directory in MongoDB is not searched. In a deployment, Twake Mail or the directory feeds those indexes. Here nothing
  does, so both are empty and the autocomplete proposes nobody. The script indexes the domain contact of
  bob@open-paas.org once, directly in OpenSearch (`domain_contact/_doc/twake-chaos-user2`, idempotent).
- **Sessions.** The signed-in features use an SSO access token kept from an earlier sign-in, in
  `$CHAOS_RUN/control-tokens`, the way a browser keeps it. It is renewed when it has less than 10 minutes left, and
  dropped when Dex restarts (Dex keeps its signing keys in memory). This is what lets "signed-in users keep working"
  be checked while the LDAP is down. `sso_sign_in` always signs in anew. If neither a cached token nor a new sign-in is
  available, a script exits 2.
- **Alarms are only scheduled for events the user has accepted.** The probe writes the organizer as an ACCEPTED
  attendee, as the web app does. An event with only an ORGANIZER line gets no alarm scheduled.
- **Cleaning.** A cancelled invitation stays in the attendee's calendar marked CANCELLED, and so does a cancelled
  booking in the owner's calendar. The scripts delete both. Mails stay in the mail catcher (`DELETE /smtpMails` would
  wipe the mails of concurrent runs).
- **Dead letters after the outages.** After the Redis and OpenSearch outages, the side service's
  RabbitMQDeadLetterQueues healthcheck stays `degraded`. Examples: `tcalendar:event:created:search-dead-letter` 7
  messages, `tcalendar:event:created:notification-dead-letter` 22, `tcalendar:event:deleted:notification-dead-letter`
  30. The events created during the OpenSearch outage were not indexed then. Whether they become searchable later
  (redelivery of the dead letters) was not checked.
