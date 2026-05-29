# My Bkper App

## Overview

A Bkper app using the single Worker platform model:

- **Client**: Book picker + accounts list with balances (`bkper-js` + `@bkper/web-auth`)
- **Server**: Hono Worker serving typed OpenAPI `/api/*` routes and `/events`
- **Events**: Creates a 20% draft transaction on `TRANSACTION_CHECKED`

## Post-Init Checklist

After running `bkper app init`, customize:

1. `bkper.yaml` identity and ownership fields
2. Logos in `client/public/images/`
3. `README.md` for end users

## Authentication

Do not implement custom OAuth flows, redirect handling, or token refresh.

| Context               | Pattern                                                                                                              | Location                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Web client direct API | `@bkper/web-auth` → `auth.getAccessToken()` → `bkper-js`                                                             | `client/src/components/my-app.ts` |
| Server API routes     | Browser sends `Authorization: Bearer <token>` to `/api/*`; platform injects auth for server-side `new Bkper()` calls | `server/src/index.ts`             |
| Event handlers        | Platform routes `/events`; handler uses `new Bkper()` with outbound auth injection                                   | `server/src/index.ts`             |
| Local dev             | Vite client auth and local outbound both use your CLI credentials (`bkper auth login`)                               | `vite.config.ts`, `bkper app dev` |

## Structure

```
client/  — Frontend UI (Vite + Lit)
server/  — Hono Worker for /api/* and /events
```

## Development

```bash
bkper auth login
bun install
npm run dev
```

This runs:

- `vite dev` — client dev server with HMR
- `bkper app dev` — one Miniflare Worker and an event tunnel to the same Worker when events are configured

## Build and deploy

```bash
npm run build
bkper app sync
bkper app deploy
```

Build output:

- OpenAPI client types → `client/src/api/generated/types.d.ts`
- Vite client build → `dist/client/`
- Worker bundle → `dist/server/`

## Configuration

```yaml
deployment:
    server: server/src/index.ts
    client: client
    services:
        - KV
    secrets: []
    compatibility_date: '2026-01-28'
```

## Key files

| Task                       | File                                             |
| -------------------------- | ------------------------------------------------ |
| Add UI features            | `client/src/components/my-app.ts`                |
| Add typed client API calls | `client/src/api/app-api.ts`                      |
| Add API schemas            | `server/src/api/schemas.ts`                      |
| Add API endpoints          | `server/src/index.ts`                            |
| Regenerate API types       | `npm run api`                                    |
| Handle events              | `server/src/index.ts` and `server/src/handlers/` |
| Configure app              | `bkper.yaml`                                     |
