# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

# Use Node.js Alpine for smaller image size
FROM node:22-alpine

ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install curl (and clean up cache)
RUN apk add --no-cache curl

# Copy prebuilt code
RUN mkdir -p dist
COPY dist/ ./dist

# Make dist/server/scripts executable
RUN chmod +x dist/scripts/*.sh

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies only if node_modules doesn't exist (for cached builds)
RUN if [ ! -d "node_modules" ]; then pnpm install --frozen-lockfile; fi

# Expose the port the app runs on
EXPOSE 3838

# Start the application
CMD ["node", "dist/index.js", "start"]
