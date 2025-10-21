# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a timezone conversion API service built with Express.js and TypeScript. It provides REST endpoints for converting timestamps between timezones using the IANA timezone database. The service runs as a Docker container and is deployed to AWS ECR across multiple environments (dev, staging, prod).

## Architecture

### Core Components

- **CLI Entry Point** (`src/server/index.ts`): Uses yargs to provide a CLI interface with `start` command and `--debug` flag
- **Express Server** (`src/server/server.ts`): Main API server with three endpoints, runs on port 3838
- **Timezone Functions** (`src/server/functions/`): Core conversion logic using the `timezonecomplete` library
  - `as-tz.ts`: Converts UTC milliseconds to ISO string in target timezone
  - `to-tz.ts`: Converts ISO string from source to target timezone
  - `getTzToTzOffset.ts`: Gets current UTC offset between two timezones
  - `setupTimezoneData.ts`: Initializes and refreshes IANA timezone data (runs on startup and every 60 seconds)
  - `fetchIANA.ts`: Fetches latest timezone data
  - `is-dst.ts`: Checks if a timezone is currently in daylight saving time

### API Endpoints

1. `POST /api/v1/as-tz` - Convert UTC milliseconds to timezone ISO string
   - Body: `{ millis: number, targetTimeZone: string }`
   - Returns: `{ ok: true, value: { iso: string } }` or error

2. `POST /api/v1/to-tz` - Convert ISO string between timezones
   - Body: `{ isoString: string, sourceTimeZone: string, targetTimeZone?: string }`
   - Returns: `{ ok: true, value: { iso: string } }` or error

3. `POST /api/v1/tz-offset` - Get offset between timezones
   - Body: `{ sourceTimeZone: string, targetTimeZone?: string }`
   - Returns: `{ ok: true, value: { offset: number } }` or error

All endpoints use `ts-rust-result` for Result type error handling.

## Development Commands

### Local Development
```bash
# Install dependencies
pnpm install

# Run dev server with auto-reload
pnpm dev

# Run with debug logging
pnpm start:debug
```

### Testing
```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui
```

Tests are located in `tests/` directory and use Vitest. Test setup is in `tests/setup.ts`.

### Building
```bash
# Build TypeScript to dist/
pnpm build
```

The build process:
1. Uses tsup to compile `src/server/**/*.ts` to ESM format in `dist/`
2. Copies scripts and timezone config files via postbuild hook
3. Makes shell scripts executable

### Docker Operations

**Local Docker Build & Test:**
```bash
# Build for local testing
pnpm docker:build:local

# Run locally
pnpm docker:run:local

# Shell into container for debugging
pnpm docker:sh
```

**Production Build (ARM64 for AWS):**
```bash
# Build for ARM64 platform
pnpm docker:build

# Build without cache
pnpm docker:build:no-cache

# Tag for ECR (requires AWS_REGION and ENV env vars)
pnpm docker:tag

# Push to ECR (requires AWS authentication)
pnpm docker:push
```

**Full CI/CD Pipeline:**
```bash
# Build, test, dockerize, and push (requires AWS_REGION and ENV)
pnpm make
```

### Timezone Data Management
```bash
# Update IANA timezone database
pnpm tz:update
```

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/make.yml`) triggers on all branch pushes except `root`:

1. Determines environment and AWS region based on branch name:
   - `dev` → us-east-2
   - `staging` → us-west-2
   - `prod` → us-east-1

2. Build process:
   - Install pnpm dependencies
   - Build source with `pnpm build`
   - Build Docker image for linux/arm64
   - Push to AWS ECR with tag matching branch name

3. Uses OIDC for AWS authentication (no static credentials)

## Deployment

The service deploys via Docker Compose (`compose.yml`):
- Uses AWS ECR image tagged by environment
- Runs on port 3838
- Connects to external `recoverysky` network
- Always restarts on failure
- Runs with `--debug` flag enabled

For local development, use `compose.local.yml` instead.

## Key Dependencies

- **timezonecomplete**: IANA timezone database and conversion logic
- **ts-rust-result**: Result type for error handling (all async functions return `Result<T, Error>`)
- **express**: HTTP server framework
- **yargs**: CLI argument parsing
- **tsup**: TypeScript bundler configured for ESM output targeting Node 22
- **vitest**: Test runner with test setup in `tests/setup.ts`

## Environment Variables

Loaded from `.env` file via dotenv. Required for:
- `AWS_REGION`: AWS region for ECR operations
- `ENV`: Environment name (dev/staging/prod)
- `NODE_ENV`: Set to 'production' in Docker

## Important Notes

- The Dockerfile expects pre-built code in `dist/` directory (build happens before Docker build in CI)
- Timezone data refreshes automatically every 60 seconds while server is running
- All timezone conversions ignore UTC offset in input ISO strings, relying on the sourceTimeZone parameter
- Logger supports debug mode controlled by CLI flag or environment
- Platform target is linux/arm64 for AWS deployment
