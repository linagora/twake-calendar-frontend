#!/bin/bash
#
# Starts the chaos stack of Twake Calendar: the backing services first, the MongoDB replica set initiated (3 members), the
# Redis Cluster created (3 masters, each node also the replica of its neighbour's master), OpenSearch and RabbitMQ checked
# whole; then esn-sabre, the side service (healthy), the proxy and the SPAs; registers the accounts in the side service,
# checks that the calendar queues are quorum queues, and that an account signs in through the SSO and reaches the REST API
# and its calendars (DAV, through the side service). Writes $CHAOS_RUN/env: what the control scripts read.
#
set -euo pipefail
. "$(dirname "$0")/common.sh"

mkdir -p "$CHAOS_RUN"
# the JWT keys of the side service (it signs the tokens esn-sabre checks with the public one)
if [ ! -s "$CHAOS_RUN/jwt_privatekey" ]; then
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$CHAOS_RUN/jwt_privatekey" 2>/dev/null
  openssl rsa -in "$CHAOS_RUN/jwt_privatekey" -pubout -out "$CHAOS_RUN/jwt_publickey" 2>/dev/null
fi
chmod 644 "$CHAOS_RUN/jwt_privatekey" "$CHAOS_RUN/jwt_publickey"

APP="twake-calendar-side-service sabre_dav proxy frontend public"
echo "==> The backing services, compose project '$CHAOS_PROJECT'"
INFRA=$(compose config --services | grep -vxF -f <(tr ' ' '\n' <<<"$APP"))
compose up -d $INFRA
wait_healthy 600 mongo1 mongo2 mongo3 rabbitmq1 rabbitmq2 rabbitmq3 redis1 redis2 redis3 ldap \
  opensearch1 opensearch2 opensearch3

echo "==> The MongoDB replica set"
if ! compose exec -T mongo1 mongosh --quiet --eval 'rs.status().ok' >/dev/null 2>&1; then
  compose exec -T mongo1 mongosh --quiet --eval 'rs.initiate({_id: "rs0", members: [
    {_id: 0, host: "mongo1:27017"}, {_id: 1, host: "mongo2:27017"}, {_id: 2, host: "mongo3:27017"}]}).ok' >/dev/null
fi
for i in $(seq 1 60); do
  mongo_healthy && break
  [ "$i" = 60 ] && { echo "the replica set has not 1 primary and 2 secondaries" >&2; compose exec -T mongo1 mongosh --quiet --eval 'rs.status().members.map(m => m.name + " " + m.stateStr)' >&2; exit 1; }
  sleep 2
done

echo "==> The Redis Cluster"
# the masters once (no slot assigned yet), then the replicas reconciled on every start: a start interrupted between the two
# leaves the cluster `ok` without its replicas
if ! compose exec -T redis1 redis-cli -p 6379 cluster info 2>/dev/null | grep -q 'cluster_slots_assigned:16384'; then
  compose exec -T redis1 redis-cli --cluster create redis1:6379 redis2:6379 redis3:6379 --cluster-yes >/dev/null
  sleep 2
fi
# a restarted stack may have a 6379 left as a replica by a failover: its slots back first, every 6379 a master (bounded)
redis_rebalance
for i in $(seq 1 30); do
  masters=0
  for n in $REDIS_NODES; do [ "$(redis_role "$n" 6379)" = master ] && masters=$((masters + 1)); done
  [ "$masters" = 3 ] && break
  [ "$i" = 30 ] && { echo "the 6379 of every Redis node is not a master" >&2; compose exec -T redis1 redis-cli -p 6379 cluster nodes >&2; exit 1; }
  redis_rebalance
  sleep 2
done
for replica in $REDIS_NODES; do
  master="${REDIS_REPLICA_OF[$replica]}"
  [ "$(redis_role "$replica" 6380)" = slave ] && continue
  id="$(compose exec -T "$master" redis-cli -p 6379 cluster myid | tr -d '\r')"
  if compose exec -T redis1 redis-cli -p 6379 cluster nodes | grep -q "^[0-9a-f]* $replica:6380"; then
    compose exec -T "$replica" redis-cli -p 6380 cluster replicate "$id" >/dev/null   # known, not a replica yet
  else
    compose exec -T redis1 redis-cli --cluster add-node "$replica:6380" redis1:6379 --cluster-slave --cluster-master-id "$id" >/dev/null
  fi
done
for i in $(seq 1 30); do
  redis_healthy && break
  [ "$i" = 30 ] && { echo "the Redis Cluster is not in its layout" >&2; compose exec -T redis1 redis-cli -p 6379 cluster nodes >&2; exit 1; }
  sleep 2
done

echo "==> OpenSearch: the 3 nodes in the cluster"
for i in $(seq 1 120); do
  n="$(compose exec -T opensearch1 curl -s 'http://localhost:9200/_cluster/health' 2>/dev/null | sed -n 's/.*"number_of_nodes":\([0-9]*\).*/\1/p' || true)"
  [ "$n" = 3 ] && break
  [ "$i" = 120 ] && { echo "OpenSearch has ${n:-no} node(s)" >&2; compose logs --tail 60 opensearch1 >&2; exit 1; }
  sleep 3
done

echo "==> RabbitMQ: the 3 nodes in the cluster"
for i in $(seq 1 60); do
  n="$(compose exec -T rabbitmq1 rabbitmqctl -q cluster_status --formatter json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["running_nodes"]))' 2>/dev/null || true)"
  [ "$n" = 3 ] && break
  [ "$i" = 60 ] && { echo "RabbitMQ has ${n:-no} running node(s)" >&2; exit 1; }
  sleep 3
done

echo "==> The SSO and the mail catcher"
for i in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$CHAOS_SSO_PORT/.well-known/openid-configuration" \
    && curl -sf -o /dev/null "http://127.0.0.1:$CHAOS_SMTP_API_PORT/smtpMails" && break
  [ "$i" = 40 ] && { echo "Dex or the mail catcher does not answer" >&2; compose logs --tail 40 sso mock-smtp >&2; exit 1; }
  sleep 3
done

# what the control scripts read (written before the application: a failed start can still be investigated with them)
cat > "$CHAOS_RUN/env" <<EOF
export CHAOS_PROJECT=$CHAOS_PROJECT
# the REST API (Host: api; the DAV API of the web app under /dav/) and esn-sabre directly (Host: dav), through the proxy
export CHAOS_API_URL=http://127.0.0.1:$CHAOS_API_PORT CHAOS_API_HOST=api CHAOS_DAV_HOST=dav
export CHAOS_WEBADMIN_URL=http://127.0.0.1:$CHAOS_WEBADMIN_PORT
export CHAOS_SSO_URL=http://127.0.0.1:$CHAOS_SSO_PORT CHAOS_SSO_TLS_URL=https://127.0.0.1:$CHAOS_SSO_TLS_PORT CHAOS_SSO_HOST=$CHAOS_SSO_HOST
export CHAOS_OIDC_CLIENT=$CHAOS_OIDC_CLIENT
export CHAOS_WEB_URL=http://127.0.0.1:$CHAOS_WEB_PORT CHAOS_PUBLIC_URL=http://127.0.0.1:$CHAOS_PUBLIC_PORT
export CHAOS_SMTP_API_URL=http://127.0.0.1:$CHAOS_SMTP_API_PORT
export CHAOS_DOMAIN=$CHAOS_DOMAIN CHAOS_USER=$CHAOS_USER CHAOS_USER2=$CHAOS_USER2 CHAOS_PASSWORD=$CHAOS_PASSWORD
EOF

echo "==> esn-sabre ($SABRE_IMAGE) and the side service ($SIDE_SERVICE_IMAGE)"
compose up -d sabre_dav
wait_healthy 300 sabre_dav
compose up -d twake-calendar-side-service
wait_healthy 600 twake-calendar-side-service
compose up -d proxy frontend public

echo "==> The accounts, registered in the side service"
for email in $CHAOS_USER $CHAOS_USER2; do
  uid="${email%@*}"
  id="$(openssl rand -hex 12)"
  status="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"firstname\":\"$uid\",\"lastname\":\"$uid\",\"id\":\"$id\"}" \
    "http://127.0.0.1:$CHAOS_WEBADMIN_PORT/registeredUsers")"
  case "$status" in
    201|409) ;;
    *) echo "the side service refused to register $email: HTTP $status" >&2; exit 1 ;;
  esac
done

echo "==> The calendar queues: quorum queues on the 3 nodes"
queues="$(compose exec -T rabbitmq1 rabbitmqctl -q list_queues name type members --formatter json)"
python3 -c '
import json, sys
queues = json.loads(sys.argv[1])
bad = [q["name"] for q in queues if q["type"] != "quorum" or len(q.get("members") or []) != 3]
if not queues or bad:
    print("not quorum queues on 3 nodes: %s" % (", ".join(bad) or "no queue"), file=sys.stderr)
    sys.exit(1)
print("    %d quorum queues" % len(queues))' "$queues"

echo "==> OpenSearch green: the indexes of the side service with their replicas assigned"
for i in $(seq 1 60); do
  opensearch_healthy && break
  [ "$i" = 60 ] && { echo "OpenSearch is not green" >&2; compose exec -T opensearch1 curl -s 'localhost:9200/_cat/shards?v' | grep -v STARTED >&2; exit 1; }
  sleep 2
done

echo "==> An account signs in (SSO, password grant) and reaches the REST API and its calendars"
for i in $(seq 1 40); do
  token="$(sso_token "$CHAOS_USER" "$CHAOS_PASSWORD" || true)"
  if [ -n "$token" ]; then
    user_id="$(curl -sf -H 'Host: api' -H "Authorization: Bearer $token" "http://127.0.0.1:$CHAOS_API_PORT/api/user" \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["_id"])' 2>/dev/null || true)"
    [ -n "$user_id" ] && curl -sf -o /dev/null -H 'Host: api' -H "Authorization: Bearer $token" -H 'Accept: application/calendar+json' \
      "http://127.0.0.1:$CHAOS_API_PORT/dav/calendars/$user_id.json?personal=true&withRights=true" && break
  fi
  [ "$i" = 40 ] && { echo "$CHAOS_USER cannot reach the API through the SSO (token: ${token:+yes}${token:-no}, user: ${user_id:-none})" >&2; exit 1; }
  sleep 3
done
echo "==> Ready: API http://127.0.0.1:$CHAOS_API_PORT (Host: api / dav), WebAdmin http://127.0.0.1:$CHAOS_WEBADMIN_PORT, SSO $CHAOS_SSO_PORT, web $CHAOS_WEB_PORT, public $CHAOS_PUBLIC_PORT, mails $CHAOS_SMTP_API_PORT ($CHAOS_RUN/env)"
