# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

# Create and set working directory
WORKDIR /usr/src/app

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (we use ci to ensure strict adherence to package-lock.json)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Stage 2: Production Runtime
FROM node:22-alpine

# Set node environment to production
ENV NODE_ENV=production

# Install dumb-init with insecure registry workaround
RUN apk add --no-cache dumb-init --repository http://dl-cdn.alpinelinux.org/alpine/v3.24/main --repository http://dl-cdn.alpinelinux.org/alpine/v3.24/community --allow-untrusted

# Set working directory
WORKDIR /usr/src/app

# Copy over production node_modules from builder (or reinstall --omit=dev, but ci is safer)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy app source code
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package.json ./

# Run container as an unprivileged user (node user is built-in to alpine images)
USER node

# Fastify listens on port 3000 by default in our setup
EXPOSE 3000

# Use dumb-init to properly handle OS signals (SIGTERM/SIGINT) for graceful shutdown
CMD ["dumb-init", "node", "src/app.js"]
