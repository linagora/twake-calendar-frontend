# Shared by build.sh, start.sh, stop.sh and the control scripts of the chaos stack of Twake Calendar. Not run on its own.
CHAOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# the checkout under test: the one this folder is in (CHAOS_REPO_DIR: another, e.g. the worktree of twake-chaos)
REPO_DIR="${CHAOS_REPO_DIR:-$(cd "$CHAOS_DIR/../.." && pwd)}"
# this folder kept out of the checkout, in twake-chaos's layout (<root>/twake-calendar/scripts/chaos, the checkout in
# <root>/worktrees/twake-calendar): that worktree
if [ -z "${CHAOS_REPO_DIR:-}" ] && [ ! -d "$REPO_DIR/e2e/docker" ] && [ -d "$CHAOS_DIR/../../../worktrees/twake-calendar/e2e/docker" ]; then
  REPO_DIR="$(cd "$CHAOS_DIR/../../../worktrees/twake-calendar" && pwd)"
fi
export CHAOS_REPO_DIR="$REPO_DIR"   # compose mounts the runtime configuration of the SPAs from it (e2e/src/test/resources)
export CHAOS_PROJECT="${CHAOS_PROJECT:-tcalendar-chaos}"
# the proxy: the REST API (Host: api) and the DAV API (Host: dav), as the web app reaches them
export CHAOS_API_PORT="${CHAOS_API_PORT:-19800}"
export CHAOS_WEBADMIN_PORT="${CHAOS_WEBADMIN_PORT:-19801}"
# Dex: plain http (the side service's and the control scripts' way in), https (the issuer, https://sso:5554, the browser's)
export CHAOS_SSO_PORT="${CHAOS_SSO_PORT:-19802}"
export CHAOS_SSO_TLS_PORT="${CHAOS_SSO_TLS_PORT:-19803}"
export CHAOS_WEB_PORT="${CHAOS_WEB_PORT:-19804}"
export CHAOS_PUBLIC_PORT="${CHAOS_PUBLIC_PORT:-19805}"
# the mail catcher's REST API (GET /api/emails...)
export CHAOS_SMTP_API_PORT="${CHAOS_SMTP_API_PORT:-19806}"
# the jwt keys shared by the side service and esn-sabre, the env of the control scripts, between start and stop
export CHAOS_RUN="${CHAOS_RUN:-${XDG_CACHE_HOME:-$HOME/.cache}/twake-chaos/$CHAOS_PROJECT}"

# The application: the two SPAs built from the commit (build.sh), WEB_IMAGE / PUBLIC_IMAGE given: those are pulled.
BUILT_WEB_IMAGE="$CHAOS_PROJECT-web:latest"
BUILT_PUBLIC_IMAGE="$CHAOS_PROJECT-public:latest"
export WEB_IMAGE="${WEB_IMAGE:-$BUILT_WEB_IMAGE}"
export PUBLIC_IMAGE="${PUBLIC_IMAGE:-$BUILT_PUBLIC_IMAGE}"
# Dex and the proxy as the e2e builds them (e2e/docker/Dockerfile.dex, Dockerfile.proxy), their configuration mounted over
export DEX_IMAGE="${DEX_IMAGE:-$CHAOS_PROJECT-dex:latest}"
export PROXY_IMAGE="${PROXY_IMAGE:-$CHAOS_PROJECT-proxy:latest}"
# The backend: the side service the e2e of the commit pins (e2e/docker/Dockerfile.tcalendar), esn-sabre of its master branch
if [ -z "${SIDE_SERVICE_IMAGE:-}" ]; then
  SIDE_SERVICE_IMAGE="$(sed -n 's/^FROM \(linagora\/twake-calendar-side-service:[^ ]*\).*/\1/p' "$REPO_DIR/e2e/docker/Dockerfile.tcalendar" 2>/dev/null | head -1 || true)"
  SIDE_SERVICE_IMAGE="${SIDE_SERVICE_IMAGE:-linagora/twake-calendar-side-service:2.5.0.5}"
fi
export SIDE_SERVICE_IMAGE
export SABRE_IMAGE="${SABRE_IMAGE:-linagora/esn-sabre:branch-master}"

# the accounts (conf/ldap/populate.ldif, registered in the side service by start.sh): password "secret"
export CHAOS_DOMAIN=open-paas.org
export CHAOS_USER=alice@open-paas.org CHAOS_USER2=bob@open-paas.org CHAOS_PASSWORD=secret
# the SSO: Dex's public client of the web app (password grant allowed for the control scripts, conf/dex/config.yaml)
export CHAOS_OIDC_CLIENT=twake-calendar CHAOS_SSO_HOST=sso

compose() {
  docker compose -p "$CHAOS_PROJECT" -f "$CHAOS_DIR/compose.yaml" "$@"
}

# health of a service's container: healthy, starting, unhealthy, running (no healthcheck), exited...
service_state() {
  local id
  id="$(compose ps -aq "$1" 2>/dev/null | head -1)"
  [ -n "$id" ] || { echo missing; return; }
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo missing
}

# The MongoDB replica set rs0 whole: its 3 members up, one primary and two secondaries (any of them the primary: a member
# back from a fault rejoins as a secondary, which is the layout as well).
MONGO_NODES="mongo1 mongo2 mongo3"
mongo_healthy() {
  local n
  for n in $MONGO_NODES; do
    compose exec -T "$n" mongosh --quiet --eval '
      const s = rs.status();
      const states = s.members.map(m => m.health === 1 ? m.stateStr : "DOWN");
      quit(s.members.length === 3 && states.filter(x => x === "PRIMARY").length === 1
        && states.filter(x => x === "SECONDARY").length === 2 ? 0 : 1);' >/dev/null 2>&1 && return 0
  done
  return 1
}

# The Redis Cluster's intended layout: on each node redisN, 6379 is the master of a third of the slots and 6380 the replica
# of the next node's master (REDIS_REPLICA_OF: redis1:6380 copies redis2's master...).
REDIS_NODES="redis1 redis2 redis3"
declare -A REDIS_REPLICA_OF=([redis1]=redis2 [redis2]=redis3 [redis3]=redis1)

redis_role() {  # redis_role <node> <port>: master / slave / nothing when unreachable
  compose exec -T "$1" redis-cli -p "$2" role 2>/dev/null | head -1 | tr -d '\r'
}

# The layout restored and whole: every 6379 a master owning slots with its replica online, every 6380 a replica whose
# link is up, the cluster ok. After a failover (a node stopped, its replica promoted) this fails until redis_rebalance.
redis_healthy() {
  local n
  compose exec -T redis1 redis-cli -p 6379 cluster info 2>/dev/null | grep -q 'cluster_state:ok' || return 1
  for n in $REDIS_NODES; do
    [ "$(redis_role "$n" 6379)" = master ] || return 1
    compose exec -T "$n" redis-cli -p 6379 cluster nodes 2>/dev/null | grep 'myself,master' | grep -qE ' [0-9]+-[0-9]+' || return 1
    compose exec -T "$n" redis-cli -p 6379 info replication 2>/dev/null | grep -q '^connected_slaves:1' || return 1
    [ "$(redis_role "$n" 6380)" = slave ] || return 1
    compose exec -T "$n" redis-cli -p 6380 info replication 2>/dev/null | grep -q '^master_link_status:up' || return 1
    # the replica copies the intended neighbour's master (by node id: master_host is an IP)
    [ "$(compose exec -T "$n" redis-cli -p 6380 cluster nodes 2>/dev/null | awk '/myself,slave/ {print $4}')" = \
      "$(compose exec -T "${REDIS_REPLICA_OF[$n]}" redis-cli -p 6379 cluster myid 2>/dev/null | tr -d '\r')" ] || return 1
  done
}

# Back to the intended layout after failovers: a 6379 that came back as a replica takes its slots back (CLUSTER FAILOVER,
# with its master's agreement, no data lost). Idempotent.
redis_rebalance() {
  local n
  for n in $REDIS_NODES; do
    if [ "$(redis_role "$n" 6379)" = slave ]; then
      compose exec -T "$n" redis-cli -p 6379 cluster failover >/dev/null 2>&1 || true
    fi
  done
}

# The 3 OpenSearch nodes, green, no shard initializing or relocating: a node back is not enough, its shards must have recovered
opensearch_healthy() {
  compose exec -T opensearch1 curl -s 'localhost:9200/_cluster/health?wait_for_status=green&timeout=5s' 2>/dev/null | python3 -c '
import json, sys
h = json.load(sys.stdin)
sys.exit(not (h["number_of_nodes"] == 3 and h["status"] == "green" and not h["timed_out"]
              and h["initializing_shards"] == 0 and h["relocating_shards"] == 0))'
}

# The 3 RabbitMQ nodes running in the cluster, and every quorum queue with its 3 members online again
rabbitmq_healthy() {
  compose exec -T rabbitmq1 rabbitmqctl -q cluster_status --formatter json 2>/dev/null \
    | python3 -c 'import json,sys; sys.exit(len(json.load(sys.stdin)["running_nodes"])!=3)' 2>/dev/null || return 1
  compose exec -T rabbitmq1 rabbitmq-diagnostics -q check_if_node_is_quorum_critical >/dev/null 2>&1
}

wait_healthy() {  # wait_healthy <seconds> <service>...
  local timeout="$1"; shift
  local deadline=$((SECONDS + timeout)) s
  for s in "$@"; do
    until [ "$(service_state "$s")" = healthy ]; do
      if [ $SECONDS -ge $deadline ]; then
        echo "$s is not healthy after ${timeout}s ($(service_state "$s"))" >&2
        compose logs --tail 80 "$s" >&2
        return 1
      fi
      sleep 3
    done
  done
}

# A bearer token of Dex for an account (password grant of the web app's client): sso_token <email> <password>
sso_token() {
  curl -s -u "$CHAOS_OIDC_CLIENT:" -d grant_type=password --data-urlencode "username=$1" --data-urlencode "password=$2" \
    -d 'scope=openid email profile' "http://127.0.0.1:$CHAOS_SSO_PORT/token" \
    | sed -n 's/.*"access_token" *: *"\([^"]*\)".*/\1/p'
}
