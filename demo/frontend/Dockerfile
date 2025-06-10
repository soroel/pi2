##
## BUILDER CONTAINER
##

# Use a more recent LTS version of Node.js with Alpine for smaller image size and better security
FROM node:20.15.1-alpine3.21 AS builder

# Create app directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Install dependencies with frozen lockfile
RUN yarn install --frozen-lockfile --production=false

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

##
## PRODUCTION CONTAINER
##


WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production=true

# Copy environment files
COPY .env ./
COPY .env.example ./

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Command to run the application
CMD ["yarn", "start"]

# We have set GENERATE_SOURCEMAP=false in our build script but we're doing this to add an extra layer
# of safety - we want to keep JS source maps from getting deployed on the production servers:
RUN rm -rf ./build/static/js/*.map

##
## RUNNER CONTAINER
##

FROM nginx:1.15.7

COPY ./docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./docker/entrypoint.sh /var/entrypoint.sh
RUN chmod +x /var/entrypoint.sh

RUN mkdir -p /var/www/webapp

COPY --from=builder /app/build /var/www/webapp

# Default nginx configuration has only one worker process running. "Auto" is a better setting.
# Commenting out any existing setting, and adding the desired one is more robust against new docker image versions.
RUN sed -i  "s/worker_processes/#worker_processes/" /etc/nginx/nginx.conf && \
    echo "worker_processes auto;" >> /etc/nginx/nginx.conf && \
    echo "worker_rlimit_nofile 16384;" >> /etc/nginx/nginx.conf

# Override the default command of the base image:
# See: https://github.com/nginxinc/docker-nginx/blob/1.15.7/mainline/stretch/Dockerfile#L99
CMD ["/var/entrypoint.sh"]
