# Bkper App Template

> **Work in Progress** — This template is not ready for use yet. The CLI tooling is still under development.

A starter template for building apps on the [Bkper Developer Platform](https://bkper.com).

## Tech Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Serverless runtime
- [Hono](https://hono.dev/) — Web framework
- [Lit](https://lit.dev/) + [@bkper/web-design](https://www.npmjs.com/package/@bkper/web-design) — UI components
- [bkper-js](https://www.npmjs.com/package/bkper-js) — Bkper SDK

## Structure

```
packages/
├── shared/     — Shared types and utilities
├── web/
│   ├── client/ — Frontend UI (Vite + Lit)
│   └── server/ — Backend API (Hono)
└── events/     — Event handler (webhooks from Bkper)
```

## Getting Started

```bash
# Install dependencies
bun install

# Start development
bun run dev
```

## Development Workflow

### Web Handler (UI)

The web handler provides the UI shown when users open your app from Bkper's menu.

Start the local development server with hot-reload:

```bash
bun run dev
```

This starts the Vite dev server. Changes to the frontend code are reflected immediately in the browser.

### Events Handler (Webhooks)

The events handler processes webhooks from Bkper (transaction posted, account updated, etc.).

Events are tested by deploying to the **development environment**:

```bash
bun run deploy:dev
```

This deploys your events handler to `https://{app-id}-dev.bkper.app/events`. Configure this URL as your webhook in the Bkper dashboard to test event handling.

**Why deploy instead of local?** Webhook testing involves triggering events from Bkper and waiting for responses. The dev environment provides a stable URL and tests against the real platform (KV storage, secrets, etc.).

### Continuous Development

When actively iterating on the events handler:

1. Make code changes
2. Run `bun run deploy:dev`
3. Trigger events from Bkper to test
4. Repeat

AI coding agents (Claude Code, OpenCode) can automate this cycle by watching for file changes and deploying automatically.

## Deployment

### Production

```bash
bun run deploy
```

This builds all packages and deploys to production at `https://{app-id}.bkper.app`.

The `predeploy` script automatically runs `bun run build` before deploying.

### Development Environment

```bash
bun run deploy:dev
```

Deploys to the development environment at `https://{app-id}-dev.bkper.app`.

## Configuration

All configuration is centralized in `bkper.yaml`:

```yaml
id: my-app
name: My App
description: A Bkper app that does something useful

# Branding
logoUrl: https://example.com/logo.svg
website: https://example.com

# Access control (usernames, not emails)
developers: someuser *@yoursite.com
users: someuser *@yoursite.com

# Menu integration (UI shown in Bkper)
menuUrl: https://${id}.bkper.app?bookId=${book.id}
menuUrlDev: http://localhost:8787?bookId=${book.id}

# Event handling (webhooks)
webhookUrl: https://${id}.bkper.app/events
webhookUrlDev: https://${id}-dev.bkper.app/events
events:
    - TRANSACTION_CHECKED

# Deployment settings
deployment:
  web:
    bundle: packages/web/server/dist
  events:
    bundle: packages/events/dist
  services:
    - KV
```

### KV Storage

The template uses [Cloudflare KV](https://developers.cloudflare.com/kv/) for caching and state. KV is configured in the `deployment.services` section.

## Resources

- [Bkper Developer Docs](https://bkper.com/docs)
- [Bkper CLI](https://www.npmjs.com/package/bkper)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)
