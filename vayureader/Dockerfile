# ==============================================================================
# BUILD STAGE
# ==============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install dependencies needed for build (including dev deps)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Prune dev dependencies for production
RUN npm prune --production

# ==============================================================================
# PRODUCTION STAGE
# ==============================================================================
FROM node:20-alpine AS production

# Install tini for signal handling
RUN apk add --no-cache tini

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Copy node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy source code
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/scripts ./scripts

# Create uploads directory with correct permissions
RUN mkdir -p uploads && chown -R node:node uploads

# Switch to non-root user
USER node

# Expose API port
EXPOSE 3000

# Start server using legacy entrypoint or standard
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/cluster.js"]
