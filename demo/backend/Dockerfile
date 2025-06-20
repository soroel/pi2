# Stage 1: Build the application
FROM node:20.13.1-alpine3.19 AS builder

# Add security updates and required tools with version pinning
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache --upgrade \
    ca-certificates=20230506-r0 \
    tzdata=2024a-r0 \
    && update-ca-certificates \
    && find / -xdev -perm +6000 -type f -exec chmod a-s {} \; || true \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Set timezone and create non-root user
ENV TZ=UTC \
    NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

WORKDIR /usr/src/app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/src/app

# Install build dependencies
RUN apk add --no-cache --upgrade \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Install dependencies
COPY --chown=appuser:appgroup package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false --network-timeout 600000

# Copy source and build
COPY ./src ./src
COPY ./tsconfig.json ./
RUN yarn build

# Stage 2: Create the production image
FROM node:20.13.1-alpine3.19

# Add security updates and required tools with version pinning
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache --upgrade \
    ca-certificates=20230506-r0 \
    tzdata=2024a-r0 \
    && update-ca-certificates \
    && find / -xdev -perm +6000 -type f -exec chmod a-s {} \; || true \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

RUN echo "kernel.kptr_restrict=2" > /etc/sysctl.d/kptr_restrict.conf \
    && echo "kernel.dmesg_restrict=1" > /etc/sysctl.d/dmesg_restrict.conf \
    && echo "fs.protected_fifos=2" > /etc/sysctl.d/protected_fifos.conf \
    && echo "fs.protected_regular=2" > /etc/sysctl.d/protected_regular.conf \
    && echo "fs.protected_hardlinks=1" > /etc/sysctl.d/protected_hardlinks.conf \
    && echo "fs.protected_symlinks=1" > /etc/sysctl.d/protected_symlinks.conf

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NODE_OPTIONS=--max-http-header-size=16384 \
    TZ=UTC

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install PM2 and clean cache
RUN yarn global add pm2@5.3.0 --network-timeout 600000 --production \
    && yarn cache clean --force \
    && npm cache clean --force \
    && rm -rf /tmp/*

WORKDIR /usr/src/app
RUN chown -R appuser:appgroup /usr/src/app \
    && chmod -R 750 /usr/src/app \
    && find /usr/src/app -type d -exec chmod 750 {} \; \
    && find /usr/src/app -type f -exec chmod 640 {} \;

COPY --chown=appuser:appgroup package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true --network-timeout 600000 \
    --ignore-engines --ignore-optional --ignore-platform --non-interactive \
    && yarn cache clean --force \
    && npm cache clean --force \
    && rm -rf /tmp/*

COPY --from=builder --chown=appuser:appgroup /usr/src/app/build ./build
COPY --chown=appuser:appgroup ./docker/processes.config.js ./

RUN mkdir -p log \
    && touch log/.keep \
    && chown -R appuser:appgroup /usr/src/app/log

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-http-header-size=16384

# Switch to non-root user
USER appuser

# Use a direct command for health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["pm2-runtime", "processes.config.js", "--env", "production"]
