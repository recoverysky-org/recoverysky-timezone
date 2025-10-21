# RecoverySky Timezone Service

A lightweight, production-ready timezone conversion API service built with Express.js and TypeScript. Provides accurate timezone conversions using the IANA timezone database with automatic updates.

## Features

- **Accurate Timezone Conversions**: Uses IANA timezone database for precise conversions
- **Auto-Updating**: Timezone data refreshes automatically every 60 seconds
- **RESTful API**: Simple JSON endpoints for all conversion needs
- **Type-Safe Error Handling**: Uses Result types for reliable error management
- **Production Ready**: Dockerized service deployed to AWS ECR
- **Debug Logging**: Optional debug mode for development and troubleshooting

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.11.0+
- Docker (for containerized deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

The server will start on `http://localhost:3838`

## API Reference

### Convert UTC Milliseconds to Timezone

Convert UTC milliseconds timestamp to ISO string in target timezone.

**Endpoint:** `POST /api/v1/as-tz`

**Request Body:**
```json
{
  "millis": 1704067200000,
  "targetTimeZone": "America/New_York"
}
```

**Response:**
```json
{
  "ok": true,
  "value": {
    "iso": "2024-01-01T00:00:00.000-05:00"
  }
}
```

### Convert Between Timezones

Convert an ISO string from one timezone to another.

**Endpoint:** `POST /api/v1/to-tz`

**Request Body:**
```json
{
  "isoString": "2024-01-01T12:00:00",
  "sourceTimeZone": "America/New_York",
  "targetTimeZone": "Europe/London"
}
```

**Response:**
```json
{
  "ok": true,
  "value": {
    "iso": "2024-01-01T17:00:00.000+00:00"
  }
}
```

**Note:** The UTC offset in the input `isoString` is ignored. The `sourceTimeZone` parameter determines the actual timezone.

### Get Timezone Offset

Get the current offset between two timezones in minutes.

**Endpoint:** `POST /api/v1/tz-offset`

**Request Body:**
```json
{
  "sourceTimeZone": "America/New_York",
  "targetTimeZone": "UTC"
}
```

**Response:**
```json
{
  "ok": true,
  "value": {
    "offset": -300
  }
}
```

### Error Responses

All endpoints return errors in Result format:

```json
{
  "ok": false,
  "error": {
    "message": "Invalid timezone: America/Invalid"
  }
}
```

## Development

### Available Commands

```bash
# Development
pnpm dev              # Run with auto-reload
pnpm start:debug      # Run with debug logging

# Testing
pnpm test             # Run tests once
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with UI

# Building
pnpm build            # Build for production

# Docker
pnpm docker:build:local   # Build Docker image locally
pnpm docker:run:local     # Run local Docker image
pnpm docker:sh            # Shell into container

# Timezone Data
pnpm tz:update        # Update IANA timezone database
```

### Project Structure

```
src/server/
├── index.ts                    # CLI entry point
├── server.ts                   # Express server & API routes
├── logger.ts                   # Logging utilities
└── functions/
    ├── as-tz.ts               # UTC millis → timezone conversion
    ├── to-tz.ts               # Timezone → timezone conversion
    ├── getTzToTzOffset.ts     # Timezone offset calculation
    ├── setupTimezoneData.ts   # IANA data initialization
    ├── fetchIANA.ts           # IANA data fetching
    └── is-dst.ts              # Daylight saving time detection

tests/
├── setup.ts                   # Test configuration
├── as-tz.test.ts             # as-tz tests
├── to-tz.test.ts             # to-tz conversion tests
└── getTzToTzOffset.test.ts   # Offset calculation tests
```

### Running Tests

All tests use Vitest:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/as-tz.test.ts

# Watch mode for TDD
pnpm test:watch
```

## Deployment

### Docker

The service uses multi-stage Docker builds optimized for production:

```bash
# Build for ARM64 (AWS deployment)
pnpm docker:build

# Run locally
docker run -p 3838:3838 recoverysky-timezone:local
```

### CI/CD

GitHub Actions automatically builds and deploys on push:

- **dev** branch → us-east-2
- **staging** branch → us-west-2
- **prod** branch → us-east-1

The pipeline:
1. Installs dependencies with pnpm
2. Builds TypeScript to dist/
3. Builds Docker image for linux/arm64
4. Pushes to AWS ECR with branch name as tag

### Environment Variables

Required for deployment:

- `AWS_REGION`: AWS region for ECR
- `ENV`: Environment name (dev/staging/prod)
- `NODE_ENV`: Set to 'production' in containers

### Docker Compose

Deploy with Docker Compose:

```bash
# Production deployment
docker compose up -d

# Local development
docker compose -f compose.local.yml up
```

The service runs on port 3838 and connects to the `recoverysky` network.

## IANA Timezone Support

This service uses the complete IANA timezone database, supporting all standard timezone identifiers:

- **Americas**: `America/New_York`, `America/Los_Angeles`, etc.
- **Europe**: `Europe/London`, `Europe/Paris`, etc.
- **Asia**: `Asia/Tokyo`, `Asia/Shanghai`, etc.
- **Australia**: `Australia/Sydney`, etc.
- **And many more**: See [IANA timezone database](https://www.iana.org/time-zones)

The timezone data automatically refreshes every 60 seconds to stay current with any IANA updates.

## Technical Details

- **Runtime**: Node.js 22
- **Framework**: Express.js
- **Language**: TypeScript (ESM modules)
- **Testing**: Vitest
- **Build Tool**: tsup
- **Package Manager**: pnpm
- **Container Platform**: linux/arm64

## License

ISC

## Authors

Pippa and Jenova
