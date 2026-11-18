# Chaos environment: the resilience claims of Twake Calendar

`claims.yaml` says, for each service Twake Calendar relies on, what it survives:

| Key | Meaning |
|---|---|
| `faultTolerance` | nodes that can be lost with no impact at all (absent: a single node) |
| `downImpact` | what stops working while the whole component is down; every other feature keeps working |
| `accidentRecovery` | `live`: once the component is back, everything works again without restarting the application |
| `requiredOnStartup` | `false`: the application starts without it, degraded as `downImpact` says |

This folder is the stack that checks them: every node of a replicated service is its own compose service, so that a
tool (twake-chaos, the Twake QA tooling) can pause, stop and restart them one by one while control scripts check the
features. `topology.yaml` maps each component of `claims.yaml` onto its services.

| Component | Nodes | Replication |
|---|---|---|
| MongoDB 8.0 | `mongo1..3` | replica set `rs0`; the side service: server default write concern (majority); esn-sabre: `w: 1` (its `generate_config.sh`) |
| OpenSearch 2.19 | `opensearch1..3` | 3 shards, 1 replica |
| RabbitMQ 4.1 | `rabbitmq1..3` | quorum queues, replication factor 3, `autoheal`; esn-sabre publishes to `rabbitmq1` only (one host) |
| Redis 8.0 | `redis1..3` | a Redis Cluster: each node the master of a third of the slots (6379) and the replica of a neighbour's (6380) |
| OpenLDAP | `ldap` (`esn_ldap`) | |
| mock-smtp-server | `mock-smtp` | |
| Dex | `sso` (OIDC, as the e2e, plus the password grant) | not claimed, never faulted |

The application: the private and public SPAs of the commit (`frontend`, `public`), the side service the e2e pins
(`twake-calendar-side-service`), esn-sabre of its master branch (`sabre_dav`, `esn_sabre`) and the e2e's proxy (`proxy`,
`api` / `dav`). Their configuration is the e2e's (e2e/src/test/resources), with the files of `conf/` mounted over it:
the nodes' lists, the replication above, Redis enabled (the e2e has none: in-memory cache and event bus).

Each container has a memory limit (~11 GB in all), heaps sized under it.

## Usage

The Docker host (or its VM) needs `vm.max_map_count` at 262144 at least: OpenSearch refuses to start below it (a
bootstrap check), and `start.sh` would wait for nodes that never become healthy (`sudo sysctl -w vm.max_map_count=262144`).

```bash
scripts/chaos/build.sh   # the SPAs of this commit (npm and nginx images, in docker), Dex and the proxy; WEB_IMAGE / PUBLIC_IMAGE: pulled instead
scripts/chaos/start.sh   # the backing services, the clusters formed and checked, the application healthy, an SSO sign-in reaching the API
scripts/chaos/check_app.sh  # does the application answer: SSO sign-in, profile, calendars, an event written / read / deleted, people search
scripts/chaos/stop.sh    # everything removed, volumes included
```

Published on 127.0.0.1: the proxy 19800 (`Host: api`: the REST API, the web app's DAV under `/dav/`; `Host: dav`:
esn-sabre), the side service's WebAdmin 19801, Dex 19802 (http) and 19803 (https, the issuer `https://sso:5554`), the
SPAs 19804 and 19805, the mail catcher's API 19806. Accounts: `alice@open-paas.org`, `bob@open-paas.org` / `secret`.
start.sh writes the URLs and accounts to `~/.cache/twake-chaos/tcalendar-chaos/env`. A token:

```bash
. scripts/chaos/common.sh
token=$(sso_token alice@open-paas.org secret)
curl -H 'Host: api' -H "Authorization: Bearer $token" http://127.0.0.1:19800/api/user
compose pause mongo2     # a hung node; `stop` for a crashed one
compose unpause mongo2
```

A browser: `--host-resolver-rules="MAP localhost:8099 127.0.0.1:19804,MAP public 127.0.0.1:19805,MAP api 127.0.0.1:19800,MAP dav 127.0.0.1:19800,MAP sso 127.0.0.1:19803" --ignore-certificate-errors`, then http://localhost:8099.
