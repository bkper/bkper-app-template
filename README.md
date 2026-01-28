# Bkper App Template

> **Work in Progress** — This template is not ready for use yet. The CLI tooling is still under development.

A starter template for building apps on the [Bkper](https://bkper.com) platform.

## Tech Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Serverless runtime
- [Hono](https://hono.dev/) — Web framework
- [Lit](https://lit.dev/) + [@bkper/web-design](https://www.npmjs.com/package/@bkper/web-design) — UI components
- [bkper-js](https://www.npmjs.com/package/bkper-js) — Bkper SDK

## Structure

- `packages/web/` — User-facing UI and API
- `packages/events/` — Background event processing
- `packages/shared/` — Shared code between web and events

## Configuration

All configuration is centralized in `bkperapp.yaml`:

```yaml
id: my-app
name: My App
# ... other metadata

# Menu integration
menuUrl: https://${id}.bkper.app?bookId=${book.id}
menuUrlDev: http://localhost:8787?bookId=${book.id}

# Event handling
webhookUrl: https://${id}.bkper.app/events
webhookUrlDev: https://${id}-dev.bkper.app/events
events:
  - TRANSACTION_CHECKED

# Deployment settings (Cloudflare Workers)
deployment:
  web:
    assets: packages/web/client/dist
    kv:
      - binding: CACHE
  events:
    kv:
      - binding: CACHE
```

See [Cloudflare KV documentation](https://developers.cloudflare.com/kv/) for KV storage details.
