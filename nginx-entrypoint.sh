#!/bin/sh
# Writes the runtime nginx maps (browser cache and frame-ancestors CSP),
# then replaces itself with nginx so that nginx runs as PID 1 and receives
# the stop signals of the container.
set -e

ENV_JS=/usr/share/nginx/html/.env.js
CACHE_ENV_CONF=/etc/nginx/conf.d/cache_env.conf

if [ -f "$ENV_JS" ] && grep -q -E 'DEBUG\s*=\s*true' "$ENV_JS"; then
  static_cache_control='no-cache'
  html_cache_control='no-cache'
  echo "Debug mode detected. Disabling Nginx browser cache."
else
  static_cache_control='public, max-age=31536000, immutable'
  html_cache_control='no-store, no-cache, must-revalidate, proxy-revalidate'
  echo "Production mode detected. Enabling Nginx browser cache."
fi

default_frame_ancestors="'self'"
frame_ancestors="${FRAME_ANCESTORS:-$default_frame_ancestors}"

cat > "$CACHE_ENV_CONF" <<EOF
map \$uri \$static_cache_control { default "$static_cache_control"; }
map \$uri \$html_cache_control { default "$html_cache_control"; }
map \$uri \$frame_ancestors_csp { default "frame-ancestors $frame_ancestors"; }
EOF

exec nginx -g 'daemon off;'
