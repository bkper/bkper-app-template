# My Bkper App

## Overview

[Describe your app here]

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

### Web Handler (UI Development)

Start the local development server with hot-reload:

```bash
bun run dev
```

The Vite dev server provides instant feedback on UI changes. Keep a browser window open to see changes in real-time.

### Events Handler (Webhook Development)

Events are tested by deploying to the development environment:

```bash
bun run deploy:dev:events
```

This deploys **only the events handler** to `https://{app-id}-dev.bkper.app/events`. The dev environment URL is stable and configured in `bkper.yaml` as `webhookUrlDev`.

**Development cycle:**
1. Make code changes to `packages/events/src/`
2. Run `bun run deploy:dev:events`
3. Trigger events from Bkper (check a transaction, update an account, etc.)
4. Check the response in Bkper's bot log
5. Repeat

### Continuous Development Pattern

When actively iterating on the events handler:

- Watch `packages/events/src/` for changes
- On file change, run `bun run deploy:dev:events`
- Report deployment status

This pattern enables rapid iteration without manual deploy commands.

## Deployment

### To Production

```bash
bun run deploy
```

Builds all packages (`predeploy` runs automatically) and deploys **web handler** to `https://{app-id}.bkper.app`.

For events handler:
```bash
bkper apps deploy --events
```

### To Development

**Web handler** (deploys web to dev environment):
```bash
bun run deploy:dev
```

**Events handler** (deploys events to dev environment):
```bash
bun run deploy:dev:events
```

Builds and deploys to `https://{app-id}-dev.bkper.app`.

## Configuration

See `bkper.yaml` for app configuration:

- **App metadata**: name, description, logo
- **Menu integration**: URLs for the popup UI
- **Event handling**: webhook URLs and subscribed events
- **Developer access**: who can update the app
- **Deployment settings**: bundle paths, KV bindings

### Key URLs

| Environment | Web Handler | Events Handler |
|-------------|-------------|----------------|
| Development | `http://localhost:*` (local Vite) | `https://{id}-dev.bkper.app/events` |
| Production | `https://{id}.bkper.app` | `https://{id}.bkper.app/events` |

### KV Storage

Cloudflare KV is available for caching and state. Access via the `CACHE` binding (or as configured in `bkper.yaml`).

See [Cloudflare KV documentation](https://developers.cloudflare.com/kv/) for usage patterns.

## Common Tasks

### Adding a New Event Handler

1. Add the event type to `bkper.yaml` under `events:`
2. Update the handler in `packages/events/src/index.ts`
3. Deploy to dev: `bun run deploy:dev:events`
4. Test by triggering the event in Bkper

### Adding a New API Route

1. Add the route in `packages/web/server/src/index.ts`
2. The dev server hot-reloads automatically

### Sharing Code Between Web and Events

Put shared code in `packages/shared/src/` and import from `@my-app/shared`.
