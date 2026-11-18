#!/bin/bash
#
# Builds the images of Twake Calendar's web app from the commit under test, as scripts/qa-environment/build.sh does (its
# e2e/pre-build.sh): both SPA bundles rebuilt (npm, in a node:24 container), the production images of apps/private and
# apps/public; Dex and the proxy from the e2e's Dockerfiles. Then pulls the images of the stack: the side service the e2e
# of the commit pins, esn-sabre of its master branch. WEB_IMAGE / PUBLIC_IMAGE given (published images): no build, those
# are pulled.
#
set -euo pipefail
. "$(dirname "$0")/common.sh"

pull() {
  docker image inspect "$1" >/dev/null 2>&1 && [ "${2:-}" != always ] || docker pull --quiet "$1"
}

# the bundle of an app (private / public), always rebuilt: a stale dist is code nobody ships (pre-build.sh's warning)
bundle() {
  echo "==> The $1 SPA bundle (npm run build:$1, node:24 in docker)"
  docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
    -v "$REPO_DIR:/app" -w /app "${NODE_IMAGE:-node:24}" sh -c "[ -d node_modules ] || npm ci; npm run build:$1"
}

if [ "$WEB_IMAGE" != "$BUILT_WEB_IMAGE" ]; then
  echo "==> Using $WEB_IMAGE (WEB_IMAGE): no build"
  pull "$WEB_IMAGE"
else
  bundle private
  echo "==> Its image (apps/private/Dockerfile)"
  docker build --quiet -f "$REPO_DIR/apps/private/Dockerfile" --build-arg BUILD_VERSION=chaos -t "$BUILT_WEB_IMAGE" "$REPO_DIR"
fi
if [ "$PUBLIC_IMAGE" != "$BUILT_PUBLIC_IMAGE" ]; then
  echo "==> Using $PUBLIC_IMAGE (PUBLIC_IMAGE): no build"
  pull "$PUBLIC_IMAGE"
else
  bundle public
  echo "==> Its image (apps/public/Dockerfile)"
  docker build --quiet -f "$REPO_DIR/apps/public/Dockerfile" --build-arg BUILD_VERSION=chaos -t "$BUILT_PUBLIC_IMAGE" "$REPO_DIR"
fi

echo "==> Dex and the proxy, as the e2e builds them"
docker build --quiet -f "$REPO_DIR/e2e/docker/Dockerfile.dex" -t "$DEX_IMAGE" "$REPO_DIR/e2e"
docker build --quiet --pull -f "$REPO_DIR/e2e/docker/Dockerfile.proxy" -t "$PROXY_IMAGE" "$REPO_DIR/e2e"

echo "==> The backend: $SIDE_SERVICE_IMAGE, $SABRE_IMAGE"
pull "$SIDE_SERVICE_IMAGE"
pull "$SABRE_IMAGE" always   # a floating tag: its latest build

echo "==> Pulling the other images"
compose pull --quiet --ignore-pull-failures $(compose config --services | grep -vxE 'frontend|public|proxy|sso|twake-calendar-side-service|sabre_dav')
