# My Bkper App

## Overview

A Bkper app that demonstrates the platform's core patterns:

- **Client**: Book picker + accounts list with balances (bkper-js + bkper-auth)
- **Events**: Creates a 20% draft transaction on TRANSACTION_CHECKED
- **Server**: Minimal Hono server (add API routes as needed)

## Tech Stack

- Cloudflare Workers for Platforms
- Hono (web framework)
- Lit + @bkper/web-design (UI)
- bkper-js (Bkper SDK)

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

# Start development server
bkper app dev
```

This single command:

- Starts the Vite dev server for the client (HMR enabled)
- Starts Miniflare to simulate the Workers runtime
- Watches server files and hot-reloads on changes
- Runs the events handler locally and exposes it via a Cloudflared tunnel (installed via devDependencies)

### Building for Deployment

```bash
bkper app build
```

This builds all configured handlers:

- Web client (Vite) → `dist/web/client/`
- Web server (esbuild) → `dist/web/server/`
- Events handler (esbuild) → `dist/events/`

### Deploying

Sync and deploy are separate operations:

```bash
# Sync app metadata (listing, urls, etc.)
bkper app sync

# Deploy code to Bkper Platform
bkper app deploy

# Deploy to development environment
bkper app deploy --preview

# Typical workflow: sync URLs, then deploy code
bkper app sync && bkper app deploy
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
        - BKPER_API_KEY # User-defined secrets
    compatibility_date: '2026-01-29' # Workers runtime version
```

### Local Secrets

1. Copy `.dev.vars.example` to `.dev.vars`
2. Add your local development values
3. `.dev.vars` is gitignored

### Generated Files

- `env.d.ts` - TypeScript types for the Worker environment (auto-generated, versioned)
- `.dev.vars.example` - Template for local secrets (versioned)

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
2. Run `bkper app build` to regenerate `env.d.ts`
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
