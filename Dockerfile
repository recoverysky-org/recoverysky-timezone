# Stage 1: Base builder image with pnpm & node
FROM node:22-slim AS builder

ENV NODE_ENV=production


# Enable pnpm (faster than npm/yarn)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Install curl using apt (Debian-based image)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy lockfile and manifest for dependency caching
COPY package.json pnpm-lock.yaml ./

# Optional: speed up installs and maximize cache usage
RUN pnpm fetch

# Install deps from offline cache
RUN pnpm install --offline --frozen-lockfile

# Copy prebuilt code (assumes you've already built locally)
COPY dist/ ./dist

# Optional: mark any scripts as executable
RUN chmod +x dist/scripts/*.sh || true

# Stage 2: Runtime image (clean, small)
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Install curl in the runtime container too (if your app needs it at runtime)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy everything from the builder stage
COPY --from=builder /app /app

# Expose app port
EXPOSE 3838

# Start app
CMD ["node", "dist/index.js", "start"]
