##
## REVERSE PROXY IMAGE
##

# Use the official nginx LTS image with a specific version for better security
FROM nginx:1.25.4-alpine3.19-slim

# Set security-related headers and configurations
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/templates \
    NGINX_ENVSUBST_TEMPLATE_SUFFIX=.conf \
    NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

# Install required packages with version pinning
RUN set -eux; \
    apk add --no-cache --upgrade \
    certbot=2.9.0-r0 \
    certbot-nginx=2.9.0-r0 \
    tzdata=2024a-r0 \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && find / -xdev -perm +6000 -type f -exec chmod a-s {} \; || true \
    && chmod -R 755 /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && chmod -R 755 /var/cache/nginx \
    && chown -R nginx:nginx /var/run \
    && chmod -R 755 /var/run \
    && chown -R nginx:nginx /etc/letsencrypt \
    && chmod -R 755 /etc/letsencrypt

COPY ./docker/nginx.conf.template /nginx.conf.template
COPY ./docker/nginx-ssl.conf.template /nginx-ssl.conf.template
COPY ./docker/entrypoint.sh /var/entrypoint.sh

RUN chmod +x /var/entrypoint.sh

# Configure nginx with security best practices
RUN set -eux; \
    # Set worker processes to auto and increase file limits
    sed -i '/^worker_processes/c\
worker_processes auto;\
worker_rlimit_nofile 16384;\
' /etc/nginx/nginx.conf; \
    \
    # Security headers and timeouts
    sed -i '/http {/a\
    # Security headers\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-XSS-Protection "1; mode=block" always;\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\
    add_header Content-Security-Policy "default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\' data:; connect-src \'self\';" always;\
    \n    # Timeouts\
    client_body_timeout 10s;\
    client_header_timeout 10s;\
    keepalive_timeout 65s;\
    send_timeout 10s;\
    \n    # Buffer size settings\
    client_body_buffer_size 16k;\
    client_max_body_size 10m;\
    large_client_header_buffers 4 16k;\
    \n    # Disable server tokens\
    server_tokens off;\
    \n    # SSL settings\
    ssl_protocols TLSv1.2 TLSv1.3;\
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;\
    ssl_prefer_server_ciphers on;\
    ssl_session_cache shared:SSL:10m;\
    ssl_session_timeout 1d;\
    ssl_session_tickets off;\
    \n    # OCSP Stapling\
    ssl_stapling on;\
    ssl_stapling_verify on;\
    resolver 1.1.1.1 1.0.0.1 [2606:4700:4700::1111] [2606:4700:4700::1001] valid=300s;\
    resolver_timeout 5s;\
' /etc/nginx/nginx.conf; \
    \
    # Remove default nginx configs
    rm -f /etc/nginx/conf.d/default.conf \
    && rm -f /etc/nginx/conf.d/example_ssl.conf

# Override the default command of the base image:
# See: https://github.com/nginxinc/docker-nginx/blob/1.15.7/mainline/stretch/Dockerfile#L99
CMD ["/var/entrypoint.sh"]
