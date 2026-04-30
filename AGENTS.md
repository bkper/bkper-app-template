# My Bkper App

## Overview

A Bkper app that demonstrates the platform's core patterns:

-   **Client**: Book picker + accounts list with balances (bkper-js + bkper-auth)
-   **Events**: Creates a 20% draft transaction on TRANSACTION_CHECKED
-   **Server**: Minimal Hono server (add API routes as needed)

## Post-Init Checklist

After running `bkper app init`, the CLI updates your app ID, package name, and URLs automatically. Before you start developing, customize the remaining branding and metadata:

1. **`bkper.yaml` identity**
   - `description` — What your app does (shown in the app listing)
   - `ownerName`, `ownerWebsite`, `ownerLogoUrl` — Your name/company
   - `repoUrl` — Link to your app's source repository

2. **App logo**
   - Replace `packages/web/client/public/images/logo-light.svg`
   - Replace `packages/web/client/public/images/logo-dark.svg`
   - SVG format recommended; used in the app listing and activity stream

3. **`README.md`**
   - Write for end users, not developers
   - Explain what the app does, how to use it, and what features are available

## Tech Stack

-   Cloudflare Workers for Platforms
-   Hono (web framework)
-   Lit + @bkper/web-design (UI)
-   bkper-js (Bkper SDK)

## Authentication

This app uses pre-configured OAuth. Do not implement custom OAuth flows, redirect handling, or token refresh.

| Context | Pattern | Location |
| --- | --- | --- |
| **Web client** | `@bkper/web-auth` → `auth.getAccessToken()` → `bkper-js` | `packages/web/client/src/components/my-app.ts` |
| **Event handlers** | `bkper-oauth-token` header → `oauthTokenProvider` | `packages/events/src/index.ts` |
| **Local dev** | Vite auth middleware uses your CLI credentials (`bkper auth login`) | `vite.config.ts` |

Before starting development:

```bash
bkper auth login   # one-time setup
```

## Structure

```
packages/
├── shared/     — Shared types and utilities
├── web/
│   ├── client/ — Frontend UI (Vite + Lit)
│   └── server/ — Backend API (Hono)
└── events/     — Event handler (webhooks)
```

## Development Workflow

### Starting Development

```bash
# Install dependencies
bun install

# Start development
npm run dev
```

This runs two processes concurrently:

-   **`vite dev`** — Client dev server with hot module replacement, configured in `vite.config.ts`
-   **`bkper app dev`** — Miniflare (Workers runtime), esbuild file watching for server/events, and a Cloudflared tunnel for event webhooks

You can also run them independently:

```bash
npm run dev:client   # Vite client dev server only
npm run dev:server   # Worker runtime (web handler only)
npm run dev:events   # Worker runtime (events handler only)
```

### Building for Deployment

```bash
npm run build
```

This runs two build steps:

-   Vite client build → `dist/web/client/`
-   esbuild worker bundles → `dist/web/server/` and `dist/events/`

### Deploying

Sync and deploy are separate operations:

```bash
# Sync app metadata (listing, urls, etc.)
bkper app sync

# Deploy code to Bkper Platform
bkper app deploy

# Deploy to development environment
bkper app deploy --preview

# Typical workflow: build, sync URLs, then deploy code
npm run build && bkper app sync && bkper app deploy
```

### Configuration

The `bkper.yaml` file is the single source of truth:

```yaml
deployment:
    web:
        main: packages/web/server/src/index.ts # Worker entry point
        client: packages/web/client # Vite project root
    events:
        main: packages/events/src/index.ts # Events handler entry point
    services:
        - KV # Cloudflare KV enabled
    secrets:
        # Add secrets your app needs (e.g. EXTERNAL_SERVICE_TOKEN)
    compatibility_date: '2026-01-29' # Workers runtime version
```

### Local Secrets

1. Copy `.dev.vars.example` to `.dev.vars`
2. Add your local development values
3. `.dev.vars` is gitignored

### Generated Files

-   `env.d.ts` - TypeScript types for the Worker environment (auto-generated, versioned)
-   `.dev.vars.example` - Template for local secrets (versioned)

## Key URLs

| Environment | Web Handler              | Events Handler                              |
| ----------- | ------------------------ | ------------------------------------------- |
| Development | `http://localhost:8787`  | `https://<random>.trycloudflare.com/events` |
| Production  | `https://{id}.bkper.app` | `https://{id}.bkper.app/events`             |

## Common Tasks

### Adding a New Event Handler

1. Add the event type to `bkper.yaml` under `events:`
2. Add a case in `packages/events/src/index.ts`
3. Create handler in `packages/events/src/handlers/`
4. Trigger the event in Bkper to test

### Adding a New API Route

1. Add the route in `packages/web/server/src/index.ts`
2. The dev server hot-reloads automatically

### Sharing Code Between Web and Events

Put shared code in `packages/shared/src/` and import from `@my-app/shared`.

### Adding Secrets

1. Add the secret name to `bkper.yaml` under `deployment.secrets:`
2. Run `npm run build` to regenerate `env.d.ts`
3. Set the secret value: `bkper app secrets put SECRET_NAME`
4. For local dev, add to `.dev.vars`

### KV Storage

Cloudflare KV is available for caching and state. Access via the `KV` binding.

```typescript
// Read
const value = await c.env.KV.get('my-key');

// Write with TTL
await c.env.KV.put('my-key', 'value', { expirationTtl: 3600 });
```

See [Cloudflare KV documentation](https://developers.cloudflare.com/kv/) for more usage patterns.

## Key Files to Modify

| Task              | File                                           |
| ----------------- | ---------------------------------------------- |
| Add UI features   | `packages/web/client/src/components/my-app.ts` |
| Add API endpoints | `packages/web/server/src/index.ts`             |
| Handle new events | `packages/events/src/index.ts` + `handlers/`   |
| Share utilities   | `packages/shared/src/`                         |
| Configure app     | `bkper.yaml`                                   |
