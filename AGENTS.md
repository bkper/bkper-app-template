# My Bkper App

## Overview

[Describe your app here]

## Tech Stack

- Cloudflare Workers for Platforms
- Hono (web framework)
- Lit + @bkper/web-design (UI)
- bkper-js (Bkper SDK)

## Structure

- `packages/web/` - User-facing UI and API
- `packages/events/` - Background event processing
- `packages/shared/` - Shared code between web and events

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Deploy to Bkper Platform
bkper deploy
```

## Configuration

See `bkperapp.yaml` for app configuration including:
- App metadata (name, description, logo)
- Menu integration URLs
- Event webhook URLs
- Developer access
