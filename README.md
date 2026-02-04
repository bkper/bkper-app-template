# My App

A Bkper app built with Cloudflare Workers, Hono, and Lit.

## Quick Start

```bash
bun install
bkper app dev
```

Open http://localhost:8787 — select a book to see it in action.

## What's Included

This template ships with a working example:

- **Client**: Shows a book picker, then lists accounts with balances for the selected book
- **Events**: Creates a 20% draft transaction when you check a transaction (try it!)
- **Server**: Minimal skeleton for adding API routes

## Project Structure

```
packages/
├── shared/               # Shared types and utilities
├── web/
│   ├── client/           # Frontend UI (Vite + Lit)
│   │   └── src/components/my-app.ts  ← Start here for UI
│   └── server/           # Backend API (Hono)
│       └── src/index.ts              ← Add API routes here
└── events/               # Event handlers (webhooks)
    └── src/
        ├── index.ts                  ← Event routing
        └── handlers/                 ← Add handlers here
```

## Development

```bash
bkper app dev
```

This single command:

- Starts the Vite dev server (hot reload for client)
- Runs the Workers runtime locally via Miniflare
- Exposes a tunnel for event webhooks

## Deploy

```bash
bkper app deploy
```

Deploys to production at `https://{app-id}.bkper.app`.

## Configuration

All configuration lives in `bkper.yaml`. Key settings:

- `id`, `name`, `description` — App identity
- `events` — Which events to subscribe to
- `deployment.secrets` — Secret names (set values with `bkper app secrets put`)
- `deployment.services` — Platform services like KV

For local development, copy `.dev.vars.example` to `.dev.vars` and add your secrets.

## Learn More

- [Bkper Developer Docs](https://bkper.com/docs)
- [Bkper CLI](https://www.npmjs.com/package/bkper)
- [bkper-js SDK](https://www.npmjs.com/package/bkper-js)
