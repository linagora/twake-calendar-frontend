FROM nginx:alpine
RUN apk add --no-cache gzip
COPY nginx.conf /etc/nginx
COPY apps/private/dist /usr/share/nginx/html
ARG BUILD_VERSION=2.0
RUN echo "var APP_VERSION = \"${BUILD_VERSION}\";" > /usr/share/nginx/html/version.js

# Initialize cache_env.conf with defaults so Nginx configuration checks pass during build
RUN echo "map \$uri \$static_cache_control { default \"no-cache\"; }" > /etc/nginx/conf.d/cache_env.conf && \
    echo "map \$uri \$html_cache_control { default \"no-cache\"; }" >> /etc/nginx/conf.d/cache_env.conf && \
    echo "map \$uri \$frame_ancestors_csp { default \"frame-ancestors 'self'\"; }" >> /etc/nginx/conf.d/cache_env.conf

# Compress static files at build-time (exclude runtime env config, version, and appList)
RUN find /usr/share/nginx/html -type f ! -name '.env.js' ! -name 'version.js' ! -name 'appList.js' ! -name '.env.example.js' ! -name 'appList.example.js' -exec gzip -k -f {} \;

# Record the exposed port
EXPOSE 80

COPY nginx-entrypoint.sh /usr/local/bin/nginx-entrypoint.sh
RUN chmod +x /usr/local/bin/nginx-entrypoint.sh

CMD ["/usr/local/bin/nginx-entrypoint.sh"]
