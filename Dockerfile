FROM nginx:alpine
RUN apk add --no-cache gzip
COPY nginx.conf /etc/nginx
COPY dist /usr/share/nginx/html

ARG BUILD_VERSION=2.0
RUN echo "var APP_VERSION = \"${BUILD_VERSION}\";" > /usr/share/nginx/html/version.js

# Initialize cache_env.conf with defaults so Nginx configuration checks pass during build
RUN echo "map \$uri \$static_cache_control { default \"no-cache\"; }" > /etc/nginx/conf.d/cache_env.conf && \
    echo "map \$uri \$html_cache_control { default \"no-cache\"; }" >> /etc/nginx/conf.d/cache_env.conf

# Compress static files at build-time (exclude runtime env config and version)
RUN find /usr/share/nginx/html -type f ! -name '.env.js' ! -name 'version.js' -exec gzip -k -f {} \;

# Record the exposed port
EXPOSE 80

CMD sh -c 'if [ -f /usr/share/nginx/html/.env.js ] && grep -q -E "DEBUG\s*=\s*true" /usr/share/nginx/html/.env.js; then \
             echo "map \$uri \$static_cache_control { default \"no-cache\"; }" > /etc/nginx/conf.d/cache_env.conf; \
             echo "map \$uri \$html_cache_control { default \"no-cache\"; }" >> /etc/nginx/conf.d/cache_env.conf; \
             echo "Debug mode detected. Disabling Nginx browser cache."; \
           else \
             echo "map \$uri \$static_cache_control { default \"public, max-age=31536000, immutable\"; }" > /etc/nginx/conf.d/cache_env.conf; \
             echo "map \$uri \$html_cache_control { default \"no-store, no-cache, must-revalidate, proxy-revalidate\"; }" >> /etc/nginx/conf.d/cache_env.conf; \
             echo "Production mode detected. Enabling Nginx browser cache."; \
           fi && nginx -g "daemon off;"'
